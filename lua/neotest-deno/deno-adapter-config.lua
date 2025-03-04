---@class neotest-deno.Config
---@field deno_cmd string Command to run deno
---@field filter_dir fun(name: string, rel_path: string, root: string): boolean Function to filter directories when searching for test files
---@field args string[] Extra arguments for deno test command
---@field env table<string, string> Environment variables for deno test command

---@type neotest-deno.Config
local M = {
	deno_cmd = "deno",
	filter_dir = function(name, _, _)
		return not vim.tbl_contains({ "node_modules", ".git" }, name)
	end,
	args = {},
	env = {},
}

return M
