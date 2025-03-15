local deno_adapter_config = require("neotest-deno.deno-adapter-config")

--- @param build_specfication table - see neotest.RunSpec
--- @param tree table - see neotest.Tree
--- @return table<string, table> - see neotest.Result
return function(build_specfication, result, tree)
	-- Get the directory of the current file
	local current_file = debug.getinfo(1, "S").source:sub(2)
	local current_dir = current_file:match("(.*/)")
	local output_raw = vim.fn.system(
		deno_adapter_config.deno_cmd
			.. " run --allow-all "
			.. current_dir
			.. "../../src/collect-results.ts "
			.. result.output
			.. " '"
			.. vim.fn.json_encode(build_specfication)
			.. "'"
	)
	local output = vim.fn.json_decode(output_raw)
	return output
end
