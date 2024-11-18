# Jetsky

This is an [Obsidian](https://obsidian.md) plugin for interacting with [Bluesky](https://bsky.social/about).

Right now, it's doing (arguably less than) the absolute minimum:

- It remembers your password
- You can authenticate to the Bluesky API with it
- You can post a selected text section

Since Bluesky uses its own [Richtext format](https://www.pfrazee.com/blog/why-facets), Obsidian Markdown to Bluesky richtext conversion isn't completely straightforward:

The only thing I've implemented so far are Markdown Links (`[]()`)

Since it's also not published as an Obisidian Community plugin (yet?), the only way to install it is by hand (e.g. cloning the repo to `.obsidian` and building it locally), or via [BRAT](https://forum.obsidian.md/t/how-to-install-plugins-from-github/50505).

One final word of warning:
Right now, your bluesky password is stored inside your `.obsidian` folder in plain text.
(Yep, I'm open to pull requests for changing that).

# Setup

For local development, the easiest way to get started is to use [Nix](https://nixos.org):

0. Install Nix: 
```shell
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
```

1. Clone the repo to your `.obsidian` folder
```shell
cd path/to/your/vault/
cd .obsidian/plugins/
git clone https://github.com/haglobah/jetsky.git
```
2. Enter the development shell (this installs everything you need)
```shell
nix develop
```
3. Run the plugin in dev mode
```shell
pnpm dev
```

For the install without Nix, have a look at the documentation for the [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin).

# Contributing

So far, I just built this for myself. It's usable, but expect it to change behavior (and me to play around with it)

That said, if you find anything to improve, please open an issue (or open a Pull Request directly :)).
