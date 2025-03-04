local deno_adapter_config = require("neotest-deno.deno-adapter-config")

--- @param build_specfication table - see neotest.RunSpec
--- @param tree table - see neotest.Tree
--- @return table<string, table> - see neotest.Result
return function(build_specfication, result, tree)
	local results = {}
	local position_id = build_specfication.context.position_id
	-- position_id /home/$user/$project/main_test.ts::secondTest

	-- Default result in case parsing fails
	results[position_id] = {
		status = "failed",
		short = "Error parsing test results",
	}

	if result.code ~= 0 and not result.output then
		return results
	end

	local position = tree:data()
	local is_test = position.type == "test"
	local is_file = position.type == "file"

    print("deno path " .. deno_adapter_config.deno_cmd)
	-- Get the directory of the current file
	local current_file = debug.getinfo(1, "S").source:sub(2)
	local current_dir = current_file:match("(.*/)")
	local output = vim.fn.system(
		deno_adapter_config.deno_cmd
			.. " run --allow-read "
			.. current_dir
			.. "../src/parse-deno-test-output.ts "
			.. result.output
	)

	local parsed_output = vim.fn.json_decode(output)
	print(vim.inspect(parsed_output))

	if parsed_output and parsed_output.tests then
		for test_name, test_data in pairs(parsed_output.tests) do
			if test_name == position.name or is_file then
				local status = "skipped"
				if test_data.type == "ok" then
					status = "passed"
				elseif test_data.type == "failed" then
					status = "failed"
				end
				-- local short_message = test_data.error test_data.logs
				local error = test_data.error
				local test_result = { status = status, errors = { error } }
				local test_position_id = position_id
				if not is_test then
					test_position_id = position.path .. "::" .. test_name
				end
				results[test_position_id] = test_result
			end
		end
	end
	if is_file then
		local status = "skipped"
		if parsed_output.type == "ok" then
			status = "passed"
		elseif parsed_output.type == "failed" then
			status = "failed"
		end

		results[position_id] = {
			status = status,
		}
	end

	print(vim.inspect(results))

	return results
end
