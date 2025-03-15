local deno_adapter_config = require("neotest-deno.deno-adapter-config")
local lib = require("neotest.lib")
local logger = require("neotest.logging")

---@class neotest.Adapter
---@field name string
local NeotestAdapter = { name = "neotest-deno", results = require("neotest-deno.collect-results") }

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

-- Cache for the query string
local query = nil
---Parse the AST of a test file to get the test positions
---@async
---@param file_path string Absolute file path
---@return neotest.Tree|nil
function NeotestAdapter.discover_positions(file_path)
	-- Lazy load the query file only when needed
	if not query then
		local query_path = vim.fn.fnamemodify(debug.getinfo(1, "S").source:sub(2), ":h")
			.. "/../ts-discover-positions.txt"
		local query_file = io.open(query_path, "r")
		if not query_file then
			logger.error("Could not open query file: " .. query_path)
			return nil
		end

		query = query_file:read("*all")
		query_file:close()
	end
	-- Get the path to the query file relative to this module

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
		table.insert(command, "--filter")
		table.insert(command, test_name)
	end

	-- Add the file path
	table.insert(command, file_path)

	logger.info("Running Deno test command: " .. table.concat(command, " "))

	return {
		command = command,
		cwd = vim.fn.getcwd(),
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
