use heck::ToLowerCamelCase as _;
use std::collections::HashMap;

#[derive(Debug)]
pub struct Extract<'o> {
    pub namespaces: HashMap<String, ExtractNamespace<'o>>,
}

#[derive(Default, Debug)]
pub struct ExtractNamespace<'o> {
    pub methods: Vec<ExtractNamespaceMethod<'o>>,
    // pub types: Vec<ExtractNamespaceType<'o>>,
}

#[derive(Debug)]
pub struct ExtractNamespaceMethod<'o> {
    pub name: String,
    pub path: &'o str,
    pub method: &'o str,
    pub description: Option<&'o str>,
    pub parameters: HashMap<String, ExtractNamespaceMethodParam<'o>>,
    pub ret: Option<&'o openapiv3::ObjectType>,
    pub download: bool,
    pub requires_scopes: Option<Vec<&'o str>>,
    // op: &'o openapiv3::Operation,
}

#[derive(Debug)]
pub struct ExtractNamespaceMethodParam<'o> {
    pub id: String,
    pub name: String,
    pub ty: &'o openapiv3::Type,
    pub description: Option<&'o str>,
    pub optional: bool,
    pub kind: ParamKind,
}

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum ParamKind {
    Query,
    QueryCurrentUserToken,
    QueryUserToken,
    Body,
    BodyCurrentUserToken,
    BodyUserToken,
}

impl ParamKind {
    pub fn is_token_id(&self) -> bool {
        matches!(
            self,
            ParamKind::QueryCurrentUserToken
                | ParamKind::BodyCurrentUserToken
                | ParamKind::QueryUserToken
                | ParamKind::BodyUserToken
        )
    }

    pub fn is_active(&self) -> bool {
        !matches!(
            self,
            ParamKind::QueryCurrentUserToken | ParamKind::BodyCurrentUserToken
        )
    }
}

impl<'o> Extract<'o> {
    /// Construct a generator construct from the OpenAPI spec.
    ///
    /// We're making a lot of assumptions about the nature of the
    /// OpenAPI spec here.  We can do this because we're _only_
    /// expecting the Twitch OpenAPI spec here; if we were not,
    /// this would be a bad idea.
    pub fn new(api: &'o openapiv3::OpenAPI) -> Result<Self, anyhow::Error> {
        let mut this = Self {
            namespaces: HashMap::new(),
        };
        for tag in &api.tags {
            this.namespaces
                .entry(tag.name.to_lower_camel_case())
                .or_default();
        }

        for (path, method, op) in api.operations() {
            this.extract_op(path, method, op, api);
        }

        Ok(this)
    }

    fn extract_op(
        &mut self,
        path: &'o str,
        method: &'o str,
        op: &'o openapiv3::Operation,
        api: &'o openapiv3::OpenAPI,
    ) {
        let namespace_name = op
            .tags
            .first()
            .unwrap_or_else(|| {
                panic!(
                    "Operation at {} {} has no tags, so we cannot determine the namespace",
                    method, path
                )
            })
            .to_lower_camel_case();
        let namespace = self.namespaces.entry(namespace_name).or_default();

        let name = op
            .operation_id
            .as_ref()
            .unwrap_or_else(|| {
                panic!(
                    "Operation at {} {} has no operationId, so we cannot determine the method name",
                    method, path
                )
            })
            .to_lower_camel_case();

        namespace.methods.push(ExtractNamespaceMethod {
            name,
            path,
            method,
            description: op.description.as_deref(),
            // the OpenAPI spec lies.
            // requires_scopes: Self::extract_scopes(op),
            requires_scopes: None,
            parameters: Self::extract_params(op, api),
            ret: Self::extract_response(op, api),
            download: op
                .responses
                .responses
                .get(&openapiv3::StatusCode::Code(200))
                .map_or(false, |x| {
                    x.as_item()
                        .map_or(false, |x| x.content.get("application/json").is_none())
                }),
        });
    }

    fn extract_response(
        op: &'o openapiv3::Operation,
        api: &'o openapiv3::OpenAPI,
    ) -> Option<&'o openapiv3::ObjectType> {
        // twitch openapi does not use a default response, so we skip directly
        // to status codes.
        let response = op
            .responses
            .responses
            .get(&openapiv3::StatusCode::Code(200))?;
        let Some(response) = response.as_item() else {
            unreachable!("Operation 200 response is a $ref, which is not supported")
        };
        let content = response.content.get("application/json")?;
        let Some(schema_ref) = content.schema.as_ref() else {
            unreachable!(
                "Operation 200 response does not have a schema ({:?})",
                op.operation_id
            )
        };
        let Some(schema) = resolve_reference_schema(schema_ref, api) else {
            unreachable!(
                "Operation 200 response schema is a $ref, but we could not resolve it ({:?})",
                op.operation_id
            )
        };
        let openapiv3::SchemaKind::Type(ty) = &schema.schema_kind else {
            unreachable!(
                "Operation 200 response schema is not a single type? ({:?})",
                op.operation_id
            )
        };
        let openapiv3::Type::Object(obj) = ty else {
            unreachable!(
                "Operation 200 response schema is not an object? ({:?})",
                op.operation_id
            )
        };

        Some(obj)
    }

    #[expect(dead_code)]
    fn extract_scopes(op: &'o openapiv3::Operation) -> Option<Vec<&'o str>> {
        op.security
            .as_ref()
            .map(|x| {
                x.iter()
                    .flat_map(|x| x.values())
                    .flat_map(|x| x.iter())
                    .map(|x| x.as_str())
                    .collect::<Vec<_>>()
            })
            .filter(|it| !it.is_empty())
    }

    fn extract_params(
        op: &'o openapiv3::Operation,
        api: &'o openapiv3::OpenAPI,
    ) -> HashMap<String, ExtractNamespaceMethodParam<'o>> {
        let mut parameters = op
            .parameters
            .iter()
            .flat_map(|v| v.as_item())
            .map(|param| {
                let param = ExtractNamespaceMethodParam::extract_query(param);
                (param.id.clone(), param)
            })
            .collect::<HashMap<_, _>>();

        if let Some(req) = op.request_body.as_ref() {
            let req = req.as_item().unwrap();
            ExtractNamespaceMethodParam::extract_body(&mut parameters, req, api);
        }
        parameters
    }
}

impl ExtractNamespaceMethod<'_> {
    #[must_use]
    pub fn has_active_params(&self) -> bool {
        self.parameters.iter().any(|(_, c)| {
            !matches!(
                c.kind,
                ParamKind::BodyCurrentUserToken | ParamKind::QueryCurrentUserToken
            )
        })
    }

    /// Checks if any of the parameters have a body kind.
    ///
    /// This function iterates over the values of the `parameters`
    /// field and checks if any of them
    /// match the `ParamKind::Body`,
    /// `ParamKind::BodyCurrentUserToken`, or
    /// `ParamKind::BodyUserToken` variants.
    ///
    /// # Returns
    ///
    /// * `true` - if any parameter is of any body kind.
    /// * `false` - otherwise.
    #[must_use]
    pub fn has_body(&self) -> bool {
        self.parameters.values().any(|x| {
            matches!(
                x.kind,
                ParamKind::Body | ParamKind::BodyCurrentUserToken | ParamKind::BodyUserToken
            )
        })
    }

    pub fn body_params(&self) -> impl Iterator<Item = &ExtractNamespaceMethodParam<'_>> {
        self.parameters.values().filter(|x| {
            matches!(
                x.kind,
                ParamKind::Body | ParamKind::BodyCurrentUserToken | ParamKind::BodyUserToken
            )
        })
    }

    pub fn query_params(&self) -> impl Iterator<Item = &ExtractNamespaceMethodParam<'_>> {
        self.parameters.values().filter(|x| {
            matches!(
                x.kind,
                ParamKind::Query | ParamKind::QueryCurrentUserToken | ParamKind::QueryUserToken
            )
        })
    }
}

impl<'o> ExtractNamespaceMethodParam<'o> {
    fn extract_query(param: &'o openapiv3::Parameter) -> Self {
        let data = match param {
            openapiv3::Parameter::Query { parameter_data, .. } => parameter_data,
            openapiv3::Parameter::Header { .. } => {
                unreachable!("the twitch api does not use header parameters; this is a bug");
            }
            openapiv3::Parameter::Cookie { .. } => {
                unreachable!("the twitch api does not use cookie parameters; this is a bug");
            }
            openapiv3::Parameter::Path { .. } => {
                unreachable!("the twitch api does not use path parameters; this is a bug");
            }
        };

        let id = data.name.to_lower_camel_case();
        let ty = pull_type(&data.format);
        let optional = !data.required;
        // this is hacky, and I want a better way.
        let kind = if is_current_user_param(data, ty) {
            ParamKind::QueryCurrentUserToken
        } else if data.name == "user_id" || data.name == "broadcaster_id" {
            ParamKind::QueryUserToken
        } else {
            ParamKind::Query
        };

        Self {
            id,
            name: data.name.clone(),
            description: data.description.as_deref(),
            optional,
            ty,
            kind,
        }
    }

    fn extract_body(
        params: &mut HashMap<String, Self>,
        req: &'o openapiv3::RequestBody,
        api: &'o openapiv3::OpenAPI,
    ) {
        let Some(content) = req.content.get("application/json") else {
            unreachable!("request body does not have a json content type")
        };
        let Some(schema_ref) = content.schema.as_ref() else {
            unreachable!("request body does not have a schema")
        };
        let Some(schema) = resolve_reference_schema(schema_ref, api) else {
            unreachable!("request body schema is a $ref, but we could not resolve it")
        };
        let openapiv3::SchemaKind::Type(ty) = &schema.schema_kind else {
            unreachable!("request body schema is not a single type?")
        };
        let openapiv3::Type::Object(obj) = ty else {
            unreachable!("request body schema is not an object?")
        };

        for (name, prop) in &obj.properties {
            let Some(prop_schema) = prop.as_item() else {
                unreachable!("request body property is a $ref, which is not supported")
            };
            let id = name.to_lower_camel_case();
            let openapiv3::SchemaKind::Type(ty) = &prop_schema.schema_kind else {
                unreachable!(
                    "the schema for the parameter is not a single type (saw {:?})",
                    schema.schema_kind
                );
            };
            let optional = !obj.required.contains(name);
            let kind = if is_current_user_body(name, prop_schema) {
                ParamKind::BodyCurrentUserToken
            } else if name == "user_id" || name == "broadcaster_id" || name == "moderator_id" {
                ParamKind::BodyUserToken
            } else {
                ParamKind::Body
            };

            let prev = params.insert(
                id.clone(),
                Self {
                    id: id.clone(),
                    name: name.clone(),
                    description: prop_schema.schema_data.description.as_deref(),
                    optional,
                    ty,
                    kind,
                },
            );

            if prev.is_some() {
                panic!("duplicate parameter id {}", id);
            }
        }
    }
}

pub(crate) fn resolve_reference_schema<'o>(
    schema: &'o openapiv3::ReferenceOr<openapiv3::Schema>,
    api: &'o openapiv3::OpenAPI,
) -> Option<&'o openapiv3::Schema> {
    match schema {
        openapiv3::ReferenceOr::Item(schema) => Some(schema),
        openapiv3::ReferenceOr::Reference { reference } => reference
            .strip_prefix("#/components/schemas/")
            .and_then(|name| {
                api.components
                    .as_ref()
                    .and_then(|components| components.schemas.get(name))
                    .and_then(|schema| resolve_reference_schema(schema, api))
            }),
    }
}

pub(crate) fn resolve_reference_boxed_schema<'o>(
    schema: &'o openapiv3::ReferenceOr<Box<openapiv3::Schema>>,
    api: &'o openapiv3::OpenAPI,
) -> Option<&'o openapiv3::Schema> {
    match schema {
        openapiv3::ReferenceOr::Item(schema) => Some(schema),
        openapiv3::ReferenceOr::Reference { reference } => reference
            .strip_prefix("#/components/schemas/")
            .and_then(|name| {
                api.components
                    .as_ref()
                    .and_then(|components| components.schemas.get(name))
                    .and_then(|schema| resolve_reference_schema(schema, api))
            }),
    }
}

fn is_current_user_param(data: &openapiv3::ParameterData, ty: &openapiv3::Type) -> bool {
    data.description.as_ref().is_some_and(|x| {
        x.contains("the user ID in the access token")
            || x.contains("the user ID in the user access token")
    }) && data.name.ends_with("_id")
        && matches!(ty, openapiv3::Type::String(_))
}

fn is_current_user_body(name: &str, schema: &openapiv3::Schema) -> bool {
    schema.schema_data.description.as_ref().is_some_and(|x| {
        x.contains("the user ID in the access token")
            || x.contains("the user ID in the user access token")
    }) && name.ends_with("_id")
        && matches!(
            schema.schema_kind,
            openapiv3::SchemaKind::Type(openapiv3::Type::String(_))
        )
}

fn pull_type(schema: &openapiv3::ParameterSchemaOrContent) -> &openapiv3::Type {
    let openapiv3::ParameterSchemaOrContent::Schema(schema) = &schema else {
        unreachable!(
            "the given parameter at is not a string? twitch api does not use content parameters..."
        );
    };
    let Some(schema) = schema.as_item() else {
        unreachable!("the schema for the parameter is a $ref, which is not supported");
    };
    let openapiv3::SchemaKind::Type(ty) = &schema.schema_kind else {
        unreachable!(
            "the schema for the parameter is not a single type (saw {:?})",
            schema.schema_kind
        );
    };
    ty
}
