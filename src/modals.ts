import { App, DropdownComponent, Modal, Setting } from "obsidian";
import { AnnotationProps, TopicProps } from "./types";
import {
	createFilesAndFolders,
	canvasData,
	annotationsData,
	reactionPaperData,
	notesData,
} from "./utilities";

class TopicModal extends Modal {
	topic: string;
	classFolder: string;
	articles: string[] = [];

	constructor(app: App) {
		super(app);
	}

	get titleTopic(): string {
		return this.topic.replace(/\s/g, "_");
	}

	get tagTopic(): string {
		return this.topic.toLocaleLowerCase().replace(/\s/g, "_");
	}

	get tagClass(): string {
		return this.classFolder.toLocaleLowerCase().replace(/\s/g, "_");
	}

	async getClassFolders(): Promise<Record<string, string>> {
		const { folders } = await this.app.vault.adapter.list("/");
		const classFolderObject = Object.fromEntries(
			folders.map((f) => [f, f])
		);

		// Remove unnecessary folders from the options
		delete classFolderObject[".obsidian"];
		delete classFolderObject["pdf"];

		return classFolderObject;
	}

	async getAnnotationArticles(): Promise<Record<string, string>> {
		const { files } = await this.app.vault.adapter.list("/pdf");
		const articlesObject = Object.fromEntries(
			files.map((f) => f.replace("pdf/", "")).map((f) => [f, f])
		);

		return articlesObject;
	}

	async onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "Generate Annotations" });

		new Setting(contentEl).setName("Topic").addText((text) =>
			text.onChange((value) => {
				this.topic = value;
			})
		);

		const classFolders = await this.getClassFolders();
		new Setting(contentEl).setName("Class").addDropdown((dropdown) => {
			dropdown.addOption("", "Select");
			dropdown.addOptions(classFolders);

			dropdown.onChange((value) => {
				this.classFolder = value;
			});
		});

		const articles = await this.getAnnotationArticles();
		new Setting(contentEl).setName("Articles").addDropdown((dropdown) => {
			dropdown.selectEl.multiple = true;
			dropdown.selectEl.classList.add("article-select");
			dropdown.addOptions(articles);

			dropdown.onChange(() => {
				this.articles = Array.from(dropdown.selectEl.options)
					.filter((o) => o.selected)
					.map((o) => o.value);
			});
		});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit();
				})
		);
	}

	onSubmit() {
		const topicProps: TopicProps = {
			titleTopic: this.titleTopic,
			tagTopic: this.tagTopic,
			tagClass: this.tagClass,
			pathArticles: this.articles.map((path) => {
				const title = path.slice(0, -4);
				return `${this.classFolder}/${this.titleTopic}/${title}_Annotated.md`;
			}),
		};
		const annotationProps: AnnotationProps[] = this.articles.map((path) => {
			const year = Number.parseInt(path.match(/[0-9]+/)![0]);

			return {
				titleArticle: path.slice(0, -4),
				fileArticle: path,
				tagYear: year,
				tagTopic: this.tagTopic,
				tagClass: this.tagClass,
			};
		});

		const pathObject = {
			[this.titleTopic]: {
				...canvasData(topicProps),
				...reactionPaperData(topicProps),
				...notesData(topicProps),
				...annotationsData(annotationProps),
			},
		};
		createFilesAndFolders(
			this.app.vault.adapter,
			pathObject,
			this.classFolder
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class PaperModal extends Modal {
	topicFolder: string;
	classFolder: string;
	articles: string[] = [];

	constructor(app: App) {
		super(app);
	}

	get tagTopic(): string {
		return this.topicFolder.toLocaleLowerCase().replace(/\s/g, "_");
	}

	get tagClass(): string {
		return this.classFolder.toLocaleLowerCase().replace(/\s/g, "_");
	}

	async getClassFolders(): Promise<Record<string, string>> {
		const { folders } = await this.app.vault.adapter.list("/");
		const classFolderObject = Object.fromEntries(
			folders.map((f) => [f, f])
		);

		// Remove unnecessary folders from the options
		delete classFolderObject[".obsidian"];
		delete classFolderObject["pdf"];

		return classFolderObject;
	}

	async getTopicFolders(
		classFolder: string
	): Promise<Record<string, string>> {
		const { folders } = await this.app.vault.adapter.list(classFolder);
		const classFolderObject = Object.fromEntries(
			folders.map((f) => [f, f])
		);

		return classFolderObject;
	}

	async getAnnotationArticles(): Promise<Record<string, string>> {
		const { files } = await this.app.vault.adapter.list("/pdf");
		const articlesObject = Object.fromEntries(
			files.map((f) => f.replace("pdf/", "")).map((f) => [f, f])
		);

		return articlesObject;
	}

	async onOpen() {
		const { contentEl } = this;
		let topicDropdown: DropdownComponent | undefined;

		contentEl.createEl("h1", { text: "Add Paper" });

		const classFolders = await this.getClassFolders();
		new Setting(contentEl).setName("Class").addDropdown((dropdown) => {
			dropdown.addOption("", "Select");
			dropdown.addOptions(classFolders);

			dropdown.onChange(async (value) => {
				this.classFolder = value;
				if (topicDropdown) {
					const topicFolders = await this.getTopicFolders(value);
					topicDropdown.selectEl.empty();
					topicDropdown.addOptions(topicFolders);
				}
			});
		});

		new Setting(contentEl).setName("Topics").addDropdown((dropdown) => {
			topicDropdown = dropdown;

			dropdown.onChange((value) => {
				this.topicFolder = value.split("/").at(-1) ?? "";
			});
		});

		const articles = await this.getAnnotationArticles();
		new Setting(contentEl).setName("Articles").addDropdown((dropdown) => {
			dropdown.selectEl.multiple = true;
			dropdown.selectEl.classList.add("article-select");
			dropdown.addOptions(articles);

			dropdown.onChange(() => {
				this.articles = Array.from(dropdown.selectEl.options)
					.filter((o) => o.selected)
					.map((o) => o.value);
			});
		});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit();
				})
		);
	}

	onSubmit() {
		const annotationProps: AnnotationProps[] = this.articles.map((path) => {
			const year = Number.parseInt(path.match(/[0-9]+/)![0]);

			return {
				titleArticle: path.slice(0, -4),
				fileArticle: path,
				tagYear: year,
				tagTopic: this.tagTopic,
				tagClass: this.tagClass,
			};
		});

		const pathObject = {
			[this.topicFolder]: {
				// ...canvasData(topicProps),
				...annotationsData(annotationProps),
			},
		};
		createFilesAndFolders(
			this.app.vault.adapter,
			pathObject,
			this.classFolder
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export { TopicModal, PaperModal };
