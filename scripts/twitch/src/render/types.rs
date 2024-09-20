use super::Render;
use heck::ToLowerCamelCase as _;

impl<W> Render<'_, W>
where
    W: std::io::Write,
{
    pub(super) fn render_type(
        &mut self,
        is_token_id: bool,
        ty: &openapiv3::Type,
    ) -> Result<(), anyhow::Error> {
        if is_token_id {
            if matches!(ty, openapiv3::Type::Array(_)) {
                write!(self.writer, "string[]")?;
                return Ok(());
            } else if matches!(ty, openapiv3::Type::String(_)) {
                write!(self.writer, "string")?;
                return Ok(());
            } else {
                unreachable!("unexpected base type {ty:?} for user token")
            }
        }

        match ty {
            openapiv3::Type::String(s) => {
                if s.enumeration.is_empty() {
                    write!(self.writer, "string")?;
                    Ok(())
                } else {
                    for variant in s.enumeration.iter().flat_map(|v| v.as_deref()) {
                        write!(self.writer, "| \"{}\"", variant.escape_default())?;
                    }
                    Ok(())
                }
            }
            openapiv3::Type::Number(_) => {
                write!(self.writer, "number")?;
                Ok(())
            }
            openapiv3::Type::Integer(_) => {
                write!(self.writer, "number")?;
                Ok(())
            }
            openapiv3::Type::Boolean(_) => {
                write!(self.writer, "boolean")?;
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
                    self.render_type(false, out)?;
                } else {
                    write!(self.writer, "unknown")?;
                }
                write!(self.writer, "[]")?;
                Ok(())
            }
            openapiv3::Type::Object(obj) => {
                writeln!(self.writer, "{{")?;
                self.render_object_type(obj)?;
                write!(
                    self.writer,
                    "\n{blank:depth$}}}",
                    blank = "",
                    depth = self.depth * 2
                )?;
                Ok(())
            }
        }
    }

    pub(super) fn render_object_type(
        &mut self,
        obj: &openapiv3::ObjectType,
    ) -> Result<(), anyhow::Error> {
        self.depth += 1;
        let mut first = true;
        for (name, prop) in obj.properties.iter() {
            let ty = crate::extract::resolve_reference_boxed_schema(prop, self.api)
                .expect("property type is a $ref, but we could not resolve it");
            let optional = !obj.required.contains(name);
            let q = if optional { "?" } else { "" };
            if first {
                first = false;
            } else {
                writeln!(self.writer, ",")?;
            }

            self.write_schema_comment(ty)?;

            write!(
                self.writer,
                "{blank:depth$}{name}{q}: ",
                blank = "",
                depth = self.depth * 2,
                name = name.to_lower_camel_case(),
            )?;
            match &ty.schema_kind {
                openapiv3::SchemaKind::Type(ty) => self.render_type(false, ty)?,
                o => unreachable!("object property type is not a supported type? {:?}", o),
            }
        }

        match obj.additional_properties.as_ref() {
            Some(openapiv3::AdditionalProperties::Any(false)) | None => {}
            Some(openapiv3::AdditionalProperties::Any(true)) => {
                writeln!(
                    self.writer,
                    "{blank:depth$}[_ in string]: unknown, ",
                    blank = "",
                    depth = self.depth * 2
                )?;
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
                write!(
                    self.writer,
                    "{blank:depth$}[_: string]: ",
                    blank = "",
                    depth = self.depth * 2
                )?;
                self.render_type(false, ty)?;
            }
        }

        self.depth -= 1;
        Ok(())
    }

    pub(super) fn write_schema_comment(
        &mut self,
        schema: &openapiv3::Schema,
    ) -> Result<(), anyhow::Error> {
        if let Some(desc) = schema.schema_data.description.as_deref() {
            let comment = super::wrap_comment(desc, 71usize.saturating_sub(self.depth * 2));
            writeln!(
                self.writer,
                "{blank:depth$}/**",
                blank = "",
                depth = self.depth * 2
            )?;
            for line in comment.trim_end().split('\n') {
                writeln!(
                    self.writer,
                    "{blank:depth$} * {line}",
                    blank = "",
                    depth = self.depth * 2,
                    line = line
                )?;
            }
            writeln!(
                self.writer,
                "{blank:depth$} */",
                blank = "",
                depth = self.depth * 2
            )?;
        }

        Ok(())
    }
}
