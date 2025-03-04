local deno_adapter_config = require("deno-adapter-config")
local lib = require("neotest.lib")
local logger = require("neotest.logging")

---@class neotest.Adapter
---@field name string
local NeotestAdapter = { name = "neotest-deno", results = require("deno-test.collect-results") }

---Find the project root directory
function NeotestAdapter.root(path)
	return lib.files.match_root_pattern("deno.json")(path)
end

---Filter directories when searching for test files
---@async
---@param name string Name of directory
---@param rel_path string Path to directory, relative to root
---@param root string Root directory of project
---@return boolean
function NeotestAdapter.filter_dir(name, rel_path, root)
	return deno_adapter_config.filter_dir(name, rel_path, root)
end

local deno_file_extensions = { "ts", "tsx", "mts", "js", "mjs", "jsx" }
---@param file_path? string
---@return boolean
function NeotestAdapter.is_test_file(file_path)
	if file_path == nil then
		-- print 'File path is nil'
		return false
	end

	-- Check against configured test patterns
	for _, ext in ipairs(deno_file_extensions) do
		if string.match(file_path, "[_%.]test%." .. ext .. "$") then
			return true
		end
	end

	-- print 'File is not a test file'
	return false
end

---Parse the AST of a test file to get the test positions
---@async
---@param file_path string Absolute file path
---@return neotest.Tree|nil
function NeotestAdapter.discover_positions(file_path)
	local query = [[
    ; Basic Deno.test with a named function
    (call_expression
      function: (member_expression
        object: (identifier) @object (#eq? @object "Deno")
        property: (property_identifier) @property (#eq? @property "test")
      )
      arguments: (arguments
        (function_expression
          name: (identifier) @test.name
        ) @test.function
      )
    ) @test.definition

    ; Deno.test with a string name and function expression
    (call_expression
      function: (member_expression
        object: (identifier) @object (#eq? @object "Deno")
        property: (property_identifier) @property (#eq? @property "test")
      )
      arguments: (arguments
        (string (string_fragment) @test.name)
        (function_expression) @test.function
      )
    ) @test.definition

    ; Deno.test with just an anonymous function or arrow function
    (call_expression
      function: (member_expression
        object: (identifier) @object (#eq? @object "Deno")
        property: (property_identifier) @property (#eq? @property "test")
      )
      arguments: (arguments
        (string (string_fragment) @test.name)
        (arrow_function) @test.function
      )
    ) @test.definition

    ; Deno.test with options object
    (call_expression
      function: (member_expression
        object: (identifier) @object (#eq? @object "Deno")
        property: (property_identifier) @property (#eq? @property "test")
      )
      arguments: (arguments
        (object
          (pair
            key: (property_identifier) @key1 (#eq? @key1 "name")
            value: (string (string_fragment) @test.name)
          )
          (pair
            key: (property_identifier) @key2 (#eq? @key2 "fn")
            value: (arrow_function) @test.function
          )
          )
        )
      ) @test.definition
  ]]

	return lib.treesitter.parse_positions(file_path, query, { nested_tests = true })
end

---Build the command to run the test
function NeotestAdapter.build_spec(args)
	local position = args.tree:data()
	local file_path = position.path

	local command = {
		deno_adapter_config.deno_cmd,
		"test",
		"--allow-all",
		"--reporter=pretty",
	}

	-- Add any extra arguments from config
	for _, arg in ipairs(deno_adapter_config.args) do
		table.insert(command, arg)
	end

	-- If we're running a specific test, add the filter
	if position.type == "test" then
		local test_name = position.name
		-- Escape special characters in the test name for the filter
		test_name = test_name:gsub("([%(%)%.%[%]%*%+%-%?%$%^])", "\\%1")
		table.insert(command, "--filter")
		table.insert(command, test_name)
	end

	-- Add the file path
	table.insert(command, file_path)

	logger.info("Running Deno test command: " .. table.concat(command, " "))

	return {
		command = command,
		context = {
			file = file_path,
			position_id = position.id,
		},
		env = deno_adapter_config.env,
	}
end

---@param user_config neotest-deno.Config
local function setup(user_config)
	deno_adapter_config = vim.tbl_deep_extend("force", deno_adapter_config, user_config or {})
	return NeotestAdapter
end

return setup
