mod method;
mod response;
mod types;

use crate::extract::{Extract, ExtractNamespace, ExtractNamespaceMethod};
use anyhow::Context as _;
use heck::ToUpperCamelCase as _;
use std::collections::VecDeque;
use std::io::Write as _;
use std::path::Path;

pub fn render(
    extract: &Extract<'_>,
    api: &openapiv3::OpenAPI,
    dir: &Path,
) -> Result<(), anyhow::Error> {
    std::fs::create_dir_all(dir).with_context(|| {
        format!(
            "when attempting to create the output directory {}",
            dir.display()
        )
    })?;

    for (name, namespace) in &extract.namespaces {
        let path = dir.join(format!("{}.ts", name));
        let mut file = std::fs::File::create(&path).with_context(|| {
            format!(
                "when attempting to create the output file {}",
                path.display()
            )
        })?;
        let mut render = Render {
            writer: &mut file,
            api,
            depth: 0,
        };
        render.render(name, namespace).with_context(|| {
            format!(
                "when attempting to render the namespace `{}` to the output file in {}",
                name,
                path.display()
            )
        })?;
    }

    let path = dir.join("index.ts");
    let mut file = std::fs::File::create(&path).with_context(|| {
        format!(
            "when attempting to create the output file {}",
            path.display()
        )
    })?;

    writeln!(file, "{FILE_NOTICE}")?;
    for name in extract.namespaces.keys() {
        writeln!(file, "export * from \"./{}\";", name)?;
    }

    Ok(())
}

pub struct Render<'o, W: std::io::Write> {
    writer: W,
    api: &'o openapiv3::OpenAPI,
    depth: usize,
}

impl<W> Render<'_, W>
where
    W: std::io::Write,
{
    fn render(&mut self, name: &str, ns: &ExtractNamespace<'_>) -> Result<(), anyhow::Error> {
        writeln!(self.writer, "{FILE_NOTICE}")?;

        for option in &ns.methods {
            if option.has_active_params() {
                self.render_requests(option)?;
            }
        }

        for ret in &ns.methods {
            self.render_response(ret)?;
        }

        let class_name = name.to_upper_camel_case();

        writeln!(
            self.writer,
            "\n\nexport class {class_name} {{\n  readonly #twitch: Twitch;\n\n  \
             constructor(twitch: Twitch) {{\n    this.#twitch = twitch;\n  }}\n"
        )?;

        for func in &ns.methods {
            self.render_method(func)?;
        }

        writeln!(self.writer, "}}")?;

        Ok(())
    }

    fn render_requests(
        &mut self,
        method: &ExtractNamespaceMethod<'_>,
    ) -> Result<(), anyhow::Error> {
        let name = format!("{}Request", method.name).to_upper_camel_case();
        writeln!(self.writer, "export interface {name} {{")?;

        for param in method.parameters.values() {
            if param.kind.is_active() {
                let q = if param.optional { "?" } else { "" };
                let comment = wrap_comment(param.description.unwrap_or(""), 74);
                writeln!(self.writer, "  /**")?;
                for line in comment.trim_end().split('\n') {
                    writeln!(self.writer, "   * {}", line)?;
                }
                write!(self.writer, "   */\n  {name}{q}: ", name = param.id)?;
                self.render_type(param.kind.is_token_id(), param.ty)?;
                writeln!(self.writer, ",")?;
            }
        }
        writeln!(self.writer, "}}")?;
        Ok(())
    }
}

fn wrap_comment(text: &str, max_line_length: usize) -> String {
    // Find the last whitespace character before the cap.
    // Because we need to take into account unicode codepoints, we can't
    // just index into the line; and we don't know how wide the character
    // codepoint will be, either, so we can't just construct an iterator
    // over the characters, take the first `cap` characters, and then
    // find the last whitespace character, as that requires
    // `CharIndices<'_>` to implement `ExactSizeIterator`, which it
    // doesn't. So, we'll just iterate over all the characters,
    // and find the last whitespace character before the cap.
    fn find_whitespace_before(text: &str, cap: usize) -> Option<usize> {
        if text.len() <= cap {
            return Some(text.len());
        }
        text.char_indices()
            .filter(|(_, c)| c.is_whitespace())
            .map(|(i, _)| i)
            .filter(|&i| i <= cap)
            .last()
    }
    fn unfold_line(text: &str, max_line_length: usize) -> VecDeque<&str> {
        let mut lines = VecDeque::<&str>::new();
        lines.push_back(text);

        while let Some(line) = lines.pop_back() {
            if line.len() <= max_line_length {
                lines.push_back(line);
                break;
            }
            let line = line.trim_start();

            if let Some(split_index) = find_whitespace_before(line, max_line_length) {
                lines.push_back(line[..split_index].trim_end_matches([' ', '\t']));
                lines.push_back(line[split_index..].trim_start_matches([' ', '\t']));
            } else if let Some(split_index) = line.chars().position(|c| c.is_whitespace()) {
                lines.push_back(line[..=split_index].trim_start_matches([' ', '\t']));
                lines.push_back(line[(split_index + 1)..].trim_end_matches([' ', '\t']));
            } else {
                lines.push_back(line);
                break;
            }
        }
        lines
    }

    text.split('\n')
        .flat_map(|line| unfold_line(line, max_line_length))
        .fold(String::new(), |mut acc, el| {
            acc.push_str(el);
            acc.push('\n');
            acc
        })
}

const FILE_NOTICE: &str = r#"
/******************************************************************************
 *
 * !!!WARNING!!!
 *
 * This file is automatically generated. Do not edit this file directly.
 *
 * This file was generated using the twitch generation script, found in the
 * `scripts/twitch` directory of the repository.
 *
 *****************************************************************************/

import type { Twitch } from "../index";
import type { TokenId } from "../types";
import { z } from "zod";
"#;
