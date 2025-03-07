# neotest-deno

A [Deno](https://deno.land/) adapter for [neotest](https://github.com/nvim-neotest/neotest).

## Features

- Run Deno tests within Neovim
- Shows test output in a nice UI
- Supports individual test runs and test suites
- Integrates with neotest's diagnostic features

## Requirements

- Neovim >= 0.10.0
- [neotest](https://github.com/nvim-neotest/neotest)
- [Deno](https://deno.land/) v2.0.0 or higher
- [nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter) with JavaScript/TypeScript parsers installed

## Installation

### Using [packer.nvim](https://github.com/wbthomason/packer.nvim)

```lua
use({
  "nvim-neotest/neotest",
  requires = {
    "hammerlink/neotest-deno",
    -- your other test adapters...
  },
  config = function()
    require("neotest").setup({
      adapters = {
        require("neotest-deno"),
      },
    })
  end,
})

### Using [lazy.nvim](https://github.com/folke/lazy.nvim)

```lua
{
  "nvim-neotest/neotest",
  dependencies = {
    "hammerlink/neotest-deno",
    -- your other test adapters...
  },
  config = function()
    require("neotest").setup({
      adapters = {
        require("neotest-deno"),
      },
    })
  end,
}
```

## Configuration

```lua
require("neotest").setup({
  adapters = {
    require("neotest-deno")({
      -- Options:
      -- deno_path = "deno", -- Custom path to Deno executable
      -- args = {}, -- Additional arguments for Deno test command
    }),
  },
})
```

## TODO
- [ ] running directories not supported
- [ ] treesitter supporting nested subtests
- [ ] support dap
- [ ] treesitter - support `Deno.test.ignore|only()` tests

## License

MIT

## Credits

This adapter is based on the neotest framework and inspired by other neotest adapters.

This README now provides comprehensive information about your neotest-deno adapter, including installation instructions, configuration options, usage examples, and other standard sections expected in a Neovim plugin README. Feel free to adjust any details that don't match your specific implementation!
