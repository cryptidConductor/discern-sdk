use crate::extract::{ExtractNamespaceMethod, ExtractNamespaceMethodParam, ParamKind};
use heck::ToUpperCamelCase;
use std::borrow::Cow;

impl<W> super::Render<'_, W>
where
    W: std::io::Write,
{
    pub(super) fn render_method(
        &mut self,
        method: &ExtractNamespaceMethod<'_>,
    ) -> Result<(), anyhow::Error> {
        let function_param_ty = format!("{}Request", method.name).to_upper_camel_case();
        let function_ret = if method.download {
            Cow::Borrowed("Response")
        } else if method.ret.is_some() {
            format!("{}Response", method.name)
                .to_upper_camel_case()
                .into()
        } else {
            "void".into()
        };
        let function_name = &method.name;
        let comment = super::wrap_comment(method.description.unwrap_or(""), 74);
        writeln!(self.writer, "  /**")?;
        for line in comment.trim_end().split('\n') {
            writeln!(self.writer, "   * {}", line)?;
        }
        write!(self.writer, "   */\n  async {function_name}(")?;
        if method.has_active_params() {
            write!(self.writer, "options: {function_param_ty}")?;
        }
        writeln!(self.writer, "): Promise<{function_ret}> {{")?;

        self.render_method_body(method)?;
        writeln!(self.writer, "  }}")?;
        Ok(())
    }

    pub(super) fn render_method_body(
        &mut self,
        method: &ExtractNamespaceMethod<'_>,
    ) -> Result<(), anyhow::Error> {
        writeln!(
            self.writer,
            "    const snapshot = await this.#twitch.snapshot();"
        )?;
        if let Some(required_scopes) = method.requires_scopes.as_ref() {
            // teehee.
            // technically we should use escape_default, instead of debug
            // format, but.
            // teehee.
            writeln!(
                self.writer,
                "    const requiredScopes = {required_scopes:?};\n    const missingScopes = \
                 requiredScopes.filter((scope) => !snapshot.scopes.includes(scope));\n    if \
                 (missingScopes.length > 0) {{\n      throw new Error(`missing required scopes: \
                 ${{missingScopes.join(', ')}}`);\n    }}"
            )?;
        }
        writeln!(
            self.writer,
            "    const url = new URL(\"{}\", this.#twitch.base);",
            method.path.escape_default()
        )?;
        for param in method.query_params() {
            self.render_method_query(param)?;
        }
        writeln!(
            self.writer,
            "    const opts: RequestInit = {{ method: '{method}' }};\n",
            method = method.method.to_ascii_uppercase().escape_default()
        )?;
        let has_body = method.has_body();
        if has_body {
            writeln!(
                self.writer,
                "    const body: Record<string, unknown> = {{}};\n"
            )?;
        }
        for param in method.body_params() {
            self.render_method_body_param(param)?;
        }
        if has_body {
            writeln!(self.writer, "    opts.body = JSON.stringify(body);")?;
        }

        if method.download {
            writeln!(
                self.writer,
                "    return await this.#twitch.requestDownload(url, opts);"
            )?;
        } else if method.ret.is_some() {
            let ztype = format!("{}Response", method.name).to_upper_camel_case();
            writeln!(
                self.writer,
                "    return await this.#twitch.request(url, opts, {ztype});"
            )?;
        } else {
            writeln!(self.writer, "    await this.#twitch.request(url, opts);")?;
        }
        Ok(())
    }

    pub(super) fn render_method_query(
        &mut self,
        param: &ExtractNamespaceMethodParam<'_>,
    ) -> Result<(), anyhow::Error> {
        match param.kind {
            ParamKind::Query | ParamKind::QueryUserToken => {
                let indent = if param.optional {
                    writeln!(self.writer, "    if (options.{id}) {{", id = param.id,)?;
                    "  "
                } else {
                    ""
                };
                if matches!(param.ty, openapiv3::Type::Array(_)) {
                    writeln!(
                        self.writer,
                        "{indent}    for (const value of options.{id}) {{\n      \
                         url.searchParams.append(\"{name}\", value.toString());\n    }}",
                        id = param.id,
                        name = param.name.escape_default()
                    )?;
                } else {
                    writeln!(
                        self.writer,
                        "{indent}    url.searchParams.append(\"{name}\", options.{id}.toString());",
                        id = param.id,
                        name = param.name.escape_default()
                    )?;
                }
                if param.optional {
                    writeln!(self.writer, "    }}")?;
                }
                Ok(())
            }
            ParamKind::QueryCurrentUserToken => {
                writeln!(
                    self.writer,
                    "    url.searchParams.append(\"{name}\", snapshot.userId);",
                    name = param.name.escape_default()
                )?;
                Ok(())
            }
            ParamKind::Body | ParamKind::BodyCurrentUserToken | ParamKind::BodyUserToken => {
                unreachable!(
                    "unexpected query parameter kind; body parameters will not be called here"
                )
            }
        }
    }

    pub(super) fn render_method_body_param(
        &mut self,
        param: &ExtractNamespaceMethodParam<'_>,
    ) -> Result<(), anyhow::Error> {
        struct BodyAccess<'n>(&'n str);
        impl std::fmt::Display for BodyAccess<'_> {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                if self.0.chars().any(|c| !c.is_alphabetic() && c != '_') {
                    write!(f, "body[\"{}\"]", self.0.escape_default())
                } else {
                    write!(f, "body.{}", self.0)
                }
            }
        }

        match param.kind {
            ParamKind::Body | ParamKind::BodyUserToken => {
                writeln!(
                    self.writer,
                    "    {body} = options.{id};",
                    id = param.id,
                    body = BodyAccess(&param.name)
                )?;
                Ok(())
            }

            ParamKind::BodyCurrentUserToken => {
                writeln!(
                    self.writer,
                    "    {body} = snapshot.userId;",
                    body = BodyAccess(&param.name)
                )?;
                Ok(())
            }
            ParamKind::Query | ParamKind::QueryCurrentUserToken | ParamKind::QueryUserToken => {
                unreachable!(
                    "unexpected query parameter kind; body parameters will not be called here"
                )
            }
        }
    }
}
