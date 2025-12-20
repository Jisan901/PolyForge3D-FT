export class AssetBrowserManager {
    public activeDir: DirInfo[] = [];
    public activeDirName: string = "/";
    private historyBack: string[] = [];
    private historyForward: string[] = [];

    constructor(private file: FileBridge, private buses: BusHub) {}

    async openDirectory(dir: string, pushHistory: boolean = true) {
        const list = await this.file.readDir(dir);

        if (pushHistory) {
            this.historyBack.push(this.activeDirName);
            this.historyForward = [];
        }

        this.activeDir = list;
        this.activeDirName = dir;

        this.buses.fsUpdate.emit();
    }

    async goBack() {
        if (this.historyBack.length === 0) return;

        this.historyForward.push(this.activeDirName);
        const dir = this.historyBack.pop()!;
        await this.openDirectory(dir, false);
    }

    async goForward() {
        if (this.historyForward.length === 0) return;

        this.historyBack.push(this.activeDirName);
        const dir = this.historyForward.pop()!;
        await this.openDirectory(dir, false);
    }

    reset() {
        this.activeDir = [];
        this.activeDirName = "/";
        this.historyBack = [];
        this.historyForward = [];
        this.buses.fsUpdate.emit();
    }
}