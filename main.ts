import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { AtpAgent, Facet } from '@atproto/api'
import { parseMarkdownUrl } from 'links'

type JetskySettings = {
  identifier: string;
  bskyPassword: string;
};

const DEFAULT_SETTINGS: JetskySettings = {
  identifier: ".bsky.social",
  bskyPassword: "",
};

export default class Jetsky extends Plugin {
	settings: JetskySettings;
	agent: AtpAgent;
	bskyPassword: string | null;

  private __handleInfoMessage(message: string) {
    new Notice(`Jetsky: ${message}`);
  }

  private __checkAuthenticated() {
    if (!this.agent.hasSession) {
      this.__handleInfoMessage("(Error) not authenticated");
      return false;
    }
    return true;
  }

  private __login() {
    if (!this.settings.identifier || !this.bskyPassword) {
      this.__handleInfoMessage("Either Identifier or bskyPassword don't exist");
      return;
    }
    if (this.agent.hasSession) {
      this.__handleInfoMessage("You're already logged in");
      return;
    }
    this.agent
      .login({
        identifier: this.settings.identifier,
        password: this.bskyPassword,
      })
      .then(() => {
        this.__handleInfoMessage("Login succeed");
      })
      .catch((error) => {
        console.error(error);
        this.__handleInfoMessage("Login failed");
      });
  }

  private async postOfSelection(text: string | null) {
    if (!this.__checkAuthenticated()) {
      return;
    }
    if (!text || ![...text].length) {
      this.__handleInfoMessage("texts are not selected");
      return;
    }

		const { spans, modifiedText } = parseMarkdownUrl(text)

		const facets: Facet[] = []
		for (const span of spans) {
			facets.push({
				index: {
					byteStart: span.start,
					byteEnd: span.end,
				},
				features: [
					{
						$type: "app.bsky.richtext.facet#link",
						uri: span.url,
					}
				]
			})
		}

    this.agent
      .post({
        $type: "app.bsky.feed.post",
        modifiedText,
        facets: facets,
      })
      .then(() => {
        this.__handleInfoMessage("Post message succeeded");
      })
      .catch((error) => {
        console.error(error);
        this.__handleInfoMessage("Failed to post");
      });
  }

	async onload() {
		await this.loadSettings();
		this.agent = new AtpAgent({
			service: "https://bsky.social"
		})
		this.addSettingTab(new SampleSettingTab(this.app, this));
		// @ts-ignore
		this.bskyPassword = this.app.loadLocalStorage("bskyPassword");

		if (this.settings.identifier && this.bskyPassword) {
			this.__login()
		}

		this.addCommand({
			id: "login",
			name: "Login",
			callback: () => {
				this.__login()
			}
		})

		this.addCommand({
			id: "post-selection",
			name: "Post the current selection on Bluesky",
			editorCallback: (editor: Editor) => {
				this.postOfSelection(editor.getSelection())
			}
		})

		this.addCommand({
			id: "clear-bsky-password",
			name: "Delete the Bluesky password from localStorage",
			callback: () => {
				const { safeStorage } = window.require('electron')
				// @ts-ignore
				this.bskyPassword = this.app.saveLocalStorage("bskyPassword", null)
			}
		})

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu) => {
				menu.addItem((item) => {
					item.setTitle("Post selection to Bluesky").onClick(() => {
						this.postOfSelection(getSelection()?.toString() ?? null)
					})
				})
			})
		)
	}

	onunload(): void {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
  plugin: Jetsky;

  constructor(app: App, plugin: Jetsky) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Jetsky Settings" });

    new Setting(containerEl)
      .setName("Identity")
      .setDesc("Enter your domain name (ex: alice.bsky.social)")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.identifier)
          .onChange(async (value) => {
            this.plugin.settings.identifier = value;
            await this.plugin.saveSettings();
          }),
      );

		new Setting(containerEl)
			.setName('BlueSky Password')
			.addText(text => text
				.setPlaceholder('Enter your password')
				.setValue(this.plugin.settings.bskyPassword)
				.onChange(async (value) => {
					this.plugin.settings.bskyPassword = value;
					await this.plugin.saveSettings();
				}));
  }
}