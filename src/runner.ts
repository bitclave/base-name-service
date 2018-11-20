import { NameService } from './nameService';

const config = require('config');

export class Runner {
    delay: number;
    timer: any;
    worker: NameService;
    constructor(worker: NameService) {
        this.delay = config.interval;
        this.worker = worker;
    }
    public start() {
        this.worker.register();
        this.timer =
            setInterval(this.worker.workingCycle.bind(this.worker), this.delay);
    }
    public stop() {
        clearTimeout(this.timer);
    }
    public once() {
        this.worker.register();
        this.worker.workingCycle();
    }
}

export default Runner
