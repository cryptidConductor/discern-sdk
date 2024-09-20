use crate::extract::ExtractNamespaceMethod;
use heck::{ToLowerCamelCase as _, ToUpperCamelCase as _};

impl<W> super::Render<'_, W>
where
    W: std::io::Write,
{
    pub(super) fn render_response(
        &mut self,
        method: &ExtractNamespaceMethod<'_>,
    ) -> Result<(), anyhow::Error> {
        if let Some(ret) = &method.ret {
            let name = format!("{}Response", method.name).to_upper_camel_case();
            write!(self.writer, "export const {name} = ")?;
            self.render_response_object(ret)?;
            writeln!(self.writer, ";")?;
            writeln!(
                self.writer,
                "export interface {name} extends z.infer<typeof {name}> {{}}\n"
            )?;
        }
        Ok(())
    }

    fn render_response_type(&mut self, ty: &openapiv3::Type) -> Result<(), anyhow::Error> {
        match ty {
            openapiv3::Type::String(s) => {
                if s.enumeration.is_empty() {
                    write!(self.writer, "z.string()")?;
                    Ok(())
                } else {
                    write!(self.writer, "z.enum([")?;
                    let mut first = true;
                    for variant in s.enumeration.iter().flat_map(|v| v.as_deref()) {
                        if first {
                            first = false;
                        } else {
                            write!(self.writer, ", ")?;
                        }
                        write!(self.writer, "\"{}\"", variant.escape_default())?;
                    }
                    write!(self.writer, "])")?;
                    Ok(())
                }
            }
            openapiv3::Type::Number(_) | openapiv3::Type::Integer(_) => {
                write!(self.writer, "z.number()")?;
                Ok(())
            }
            openapiv3::Type::Boolean(_) => {
                write!(self.writer, "z.boolean()")?;
                Ok(())
            }
            openapiv3::Type::Array(v) => {
                if let Some(item) = v
                    .items
                    .as_ref()
                    .and_then(|item| crate::extract::resolve_reference_boxed_schema(item, self.api))
                {
                    let out = match &item.schema_kind {
                        openapiv3::SchemaKind::Type(ty) => ty,
                        o => unreachable!("array item type is not a supported type? {:?}", o),
                    };
                    self.render_response_type(out)?;
                } else {
                    write!(self.writer, "z.unknown()")?;
                }
                write!(self.writer, ".array()")?;
                Ok(())
            }
            openapiv3::Type::Object(obj) => {
                self.render_response_object(obj)?;
                Ok(())
            }
        }
    }

    fn render_response_object(&mut self, obj: &openapiv3::ObjectType) -> Result<(), anyhow::Error> {
        if !obj.properties.is_empty() {
            let transforms = should_transform_properties(obj);
            writeln!(self.writer, "z.object({{")?;
            self.depth += 1;
            let mut first = true;
            for (name, prop) in obj.properties.iter() {
                let ty = crate::extract::resolve_reference_boxed_schema(prop, self.api)
                    .expect("property type is a $ref, but we could not resolve it");
                let optional = !obj.required.contains(name);
                if first {
                    first = false;
                } else {
                    writeln!(self.writer, ",")?;
                }

                if !transforms {
                    self.write_schema_comment(ty)?;
                }

                write!(
                    self.writer,
                    "{blank:depth$}\"{name}\": ",
                    blank = "",
                    depth = self.depth * 2,
                )?;
                match &ty.schema_kind {
                    openapiv3::SchemaKind::Type(ty) => self.render_response_type(ty)?,
                    o => unreachable!("object property type is not a supported type? {:?}", o),
                }

                if optional {
                    write!(self.writer, ".optional()")?;
                }
            }

            if transforms {
                writeln!(
                    self.writer,
                    "\n{blank:depth$}}}).transform((it) => ({{",
                    blank = "",
                    depth = (self.depth - 1) * 2
                )?;

                for (name, prop) in obj.properties.iter() {
                    let ty = crate::extract::resolve_reference_boxed_schema(prop, self.api)
                        .expect("property type is a $ref, but we could not resolve it");
                    self.write_schema_comment(ty)?;
                    writeln!(
                        self.writer,
                        "{blank:depth$}\"{id}\": it[\"{name}\"],",
                        blank = "",
                        depth = self.depth * 2,
                        id = name.to_lower_camel_case(),
                    )?;
                }
                self.depth -= 1;

                write!(
                    self.writer,
                    "\n{blank:depth$}}}))",
                    blank = "",
                    depth = self.depth * 2
                )?;
            } else {
                self.depth -= 1;
                write!(
                    self.writer,
                    "\n{blank:depth$}}})",
                    blank = "",
                    depth = self.depth * 2
                )?;
            }
        } else {
            write!(self.writer, "z.object({{}})")?;
        }

        match obj.additional_properties.as_ref() {
            Some(openapiv3::AdditionalProperties::Any(false)) | None => {}
            Some(openapiv3::AdditionalProperties::Any(true)) => {
                writeln!(self.writer, ".catchall(z.unknown())")?;
            }
            Some(openapiv3::AdditionalProperties::Schema(schema)) => {
                let Some(schema) = crate::extract::resolve_reference_schema(schema, self.api)
                else {
                    unreachable!(
                        "additional properties schema is a $ref, but we could not resolve it"
                    )
                };
                let openapiv3::SchemaKind::Type(ty) = &schema.schema_kind else {
                    unreachable!("additional properties schema is not a single type?")
                };
                self.write_schema_comment(schema)?;
                write!(self.writer, ".catchall(")?;
                self.depth += 1;
                self.render_response_type(ty)?;
                self.depth -= 1;
                write!(self.writer, ")",)?;
            }
        }

        Ok(())
    }
}

fn should_transform_properties(obj: &openapiv3::ObjectType) -> bool {
    obj.properties.iter().any(|(name, _)| name.contains('_'))
}
