import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { AtpAgent, Facet } from '@atproto/api'
import { processMarkdownLinks } from 'src/links'
import { parseMentions, processMentions } from 'src/mentions'

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
    if (!this.settings.identifier || !this.settings.bskyPassword) {
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
        password: this.settings.bskyPassword,
      })
      .then(() => {
        this.__handleInfoMessage("Login succeed");
      })
      .catch((error) => {
        console.error(error);
        this.__handleInfoMessage("Login failed");
      });
  }

  private async postOfSelection(editor: Editor) {
		const text = editor.getSelection()
		
		if (!this.__checkAuthenticated()) {
      return;
    }
    if (!text || ![...text].length) {
      this.__handleInfoMessage("texts are not selected");
      return;
    }

		const { urlSpans, modifiedText } = processMarkdownLinks(text)
		const { mentionSpans } = parseMentions(modifiedText)

		const facets: Facet[] = []
		for (const span of urlSpans) {
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
		processMentions(facets, )
		for (const span of mentionSpans) {
			facets.push({
				index: {
					byteStart: span.start,
					byteEnd: span.end,
				},
				features: [
					{
						$type: "app.bsky.richtext.facet#mention",
						handle: span.url,
					}
				]
			})
		}
		const now = (new Date()).toISOString()

		const currentSelectionPost = {
			$type: "app.bsky.feed.post",
			text: modifiedText,
			createdAt: now,
			facets: facets,
		}

    this.agent
      .post(currentSelectionPost)
      .then(() => {
        this.__handleInfoMessage("Post message succeeded");
				editor.replaceSelection(`> posted ${now}\n` + text)
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
				this.postOfSelection(editor)
			}
		})
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
