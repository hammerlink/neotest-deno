(call_expression
  function: [
      ; Basic test `Deno.test(...)`
      (member_expression
        object: (identifier) @object (#eq? @object "Deno")
        property: (property_identifier) @property (#eq? @property "test")
      )
      ; Ignored test `Deno.test.ignore(...)`
      (member_expression
        object: (member_expression
            object: (identifier) @object (#eq? @object "Deno")
            property: (property_identifier) @property (#eq? @property "test")
        )
        property: (property_identifier) @ignore (#eq? @ignore "ignore")
      )
  ]
  arguments: [
      ; Name function `function mytest() {}`
      (arguments
        (function_expression
          name: (identifier) @test.name
        ) @test.function
      )
      ; TestName & nameless function `'MyTest', function() {}`
      (arguments
        (string (string_fragment) @test.name)
        (function_expression) @test.function
      )
      ; TestName & arrow function, `'MyTest', () => {}`
      (arguments
        (string (string_fragment) @test.name)
        (arrow_function) @test.function
      )
      ; Test Object `{name: 'MyTest', fn: function() {}}`
      (arguments
        (object
          (pair
            key: (property_identifier) @key1 (#eq? @key1 "name")
            value: (string (string_fragment) @test.name)
          )
          [
            ; `{name: 'MyTest', fn: () => {} | function() {}}`
            (pair
              key: (property_identifier) @key2 (#eq? @key2 "fn")
              value: [
                (arrow_function) 
                (function_expression)
              ] @test.function
            )
            ; `{name: 'MyTest', fn() {}}`
            (method_definition
              name: (property_identifier) @object_fn (#eq? @object_fn "fn")
            )
          ]
        )
      )
      ; Test Object & name function `{name: 'MyTest', fn: function CustonName() {}}`
      ; Test Object & arrow `{name: 'MyTest', fn: function CustonName() {}}`
  ]
) @test.definition
