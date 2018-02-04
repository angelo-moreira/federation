use format::{Displayable, Formatter, Style};
use query::*;

impl Document {
    pub fn format(&self, style: &Style) -> String {
        let mut formatter = Formatter::new(style);
        self.display(&mut formatter);
        formatter.into_string()
    }
    pub fn to_string(&self) -> String {
        self.format(&Style::default())
    }
}

impl Displayable for Document {
    fn display(&self, f: &mut Formatter) {
        for item in &self.definitions {
            item.display(f);
        }
    }
}

impl Displayable for Definition {
    fn display(&self, f: &mut Formatter) {
        match *self {
            Definition::Operation(ref op) => op.display(f),
            Definition::Fragment(ref frag) => frag.display(f),
        }
    }
}

impl Displayable for OperationDefinition {
    fn display(&self, f: &mut Formatter) {
        match *self {
            OperationDefinition::SelectionSet(ref set) => set.display(f),
            OperationDefinition::Query(ref q) => q.display(f),
            _ => unimplemented!(),
        }
    }
}

impl Displayable for FragmentDefinition {
    fn display(&self, f: &mut Formatter) {
        unimplemented!();
    }
}

impl Displayable for SelectionSet {
    fn display(&self, f: &mut Formatter) {
        f.indent();
        f.start_block();
        for item in &self.items {
            item.display(f);
        }
        f.end_block();
    }
}

impl Displayable for Selection {
    fn display(&self, f: &mut Formatter) {
        match *self {
            Selection::Field(ref fld) => fld.display(f),
            Selection::InlineFragment(ref frag) => frag.display(f),
            Selection::FragmentSpread(ref frag) => frag.display(f),
        }
    }
}

impl Displayable for Field {
    fn display(&self, f: &mut Formatter) {
        f.indent();
        if let Some(ref alias) = self.alias {
            f.write(alias);
            f.write(": ");
        }
        f.write(&self.name);
        if self.arguments.len() > 0 {
            f.write("(");
            f.write(&self.arguments[0].0);
            f.write(": ");
            self.arguments[0].1.display(f);
            for arg in &self.arguments[1..] {
                f.write(", ");
                f.write(&arg.0);
                f.write(": ");
                arg.1.display(f);
            }
            f.write(")");
        }
        // TODO(tailhook) directives
        if self.selection_set.items.len() > 0 {
            f.write(" ");
            f.start_block();
            for item in &self.selection_set.items {
                item.display(f);
            }
            f.end_block();
        } else {
            f.endline();
        }
    }
}

impl Displayable for Query {
    fn display(&self, f: &mut Formatter) {
        f.indent();
        f.write("query ");
        if let Some(ref name) = self.name {
            f.write(name);
            if self.variable_definitions.len() > 0 {
                f.write("(");
                for var in &self.variable_definitions {
                    var.display(f);
                }
                f.write(")");
            }
            f.write(" ");
        }
        f.start_block();
        for item in &self.selection_set.items {
            item.display(f);
        }
        f.end_block();
        // TODO(tailhook) other parts
    }
}

impl Displayable for VariableDefinition {
    fn display(&self, f: &mut Formatter) {
        f.write("$");
        f.write(&self.name);
        f.write(": ");
        self.var_type.display(f);
        if let Some(ref default) = self.default_value {
            f.write(" = ");
            default.display(f);
        }
    }
}

impl Displayable for VariableType {
    fn display(&self, f: &mut Formatter) {
        match *self {
            VariableType::NamedType(ref name) => f.write(name),
            VariableType::ListType(ref typ) => {
                f.write("[");
                typ.display(f);
                f.write("]");
            }
            VariableType::NonNullType(ref typ) => {
                typ.display(f);
                f.write("!");
            }
        }
    }
}

impl Displayable for Value {
    fn display(&self, f: &mut Formatter) {
        match *self {
            Value::Variable(ref name) => { f.write("$"); f.write(name); },
            Value::Int(ref num) => f.write(&format!("{}", num.0)),
            Value::Float(val) => f.write(&format!("{}", val)),
            Value::String(ref val) => unimplemented!(),
            Value::Boolean(true) => f.write("true"),
            Value::Boolean(false) => f.write("false"),
            Value::Null => f.write("null"),
            Value::EnumValue(ref name) => f.write(name),
            Value::ListValue(ref items) => {
                f.write("[");
                if items.len() > 0 {
                    items[0].display(f);
                    for item in &items[1..] {
                        f.write(", ");
                        item.display(f);
                    }
                }
                f.write("]");
            }
            Value::ObjectValue(ref items) => unimplemented!(),
        }
    }
}

impl Displayable for InlineFragment {
    fn display(&self, f: &mut Formatter) {
        f.indent();
        f.write("... ");
        if let Some(ref cond) = self.type_condition {
            cond.display(f);
            f.write(" ");
        }
        f.start_block();
        for item in &self.selection_set.items {
            item.display(f);
        }
        f.end_block();
    }
}

impl Displayable for TypeCondition {
    fn display(&self, f: &mut Formatter) {
        match *self {
            TypeCondition::On(ref name) => {
                f.write("on ");
                f.write(name);
            }
        }
    }
}

impl Displayable for FragmentSpread {
    fn display(&self, f: &mut Formatter) {
        unimplemented!();
    }
}
