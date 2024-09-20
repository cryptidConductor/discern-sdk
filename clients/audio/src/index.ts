/// <reference types="@discern/types" />

type PlayResponse =
  | { status: "ok"; data: null }
  | {
      status: "error";
      data: "could-not-play" | "could-not-read" | "bad-url" | "bad-message";
    };

type FsFile = NonNullable<Awaited<ReturnType<Discern.Configuration["file"]>>>;

export class Audio {
  static plugin: Discern.Plugin | null = null;

  constructor() {}

  async playPluginFile(path: string) {
    const file = await Discern.plugin.files.open(path);
    const clip = await this.clipFromFile(file);
    try {
      await this.playClip(clip);
    } finally {
      clip.close();
    }
  }

  async playClip(clip: AudioClip) {
    const response = await Discern.ask<{ url: string }, PlayResponse>(
      "/$/system/audio/play",
      { url: clip.blobUrl }
    );

    if (response.contents.status === "error") {
      throw new Error(`could not play: ${response.contents.data}`);
    }
  }

  async clipFromFile(file: FsFile): Promise<AudioClip> {
    const blob = await new Response(file.readable).blob();
    return new AudioClip(URL.createObjectURL(blob));
  }
}

export class AudioClip {
  #blobUrl: string;

  constructor(blobUrl: string) {
    this.#blobUrl = blobUrl;
  }

  close() {
    URL.revokeObjectURL(this.#blobUrl);
  }

  get blobUrl() {
    return this.#blobUrl;
  }
}
