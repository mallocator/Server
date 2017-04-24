const config = require('cheevr-config');
const fork = require('fork-require');
const shortId = require('shortid');


/**
 * The worker class wraps communication with the runner process that will run a task in a separate node instance.
 * All method calls on this object are proxied if they don't exist already and sent to the runner process transparently.
 */
class Worker {
    /**
     * @param  task
     * @param file
     * @returns {Proxy}
     */
    constructor(task, file) {
        this._id = shortId.generate();
        this._task = task;
        this._file = file;
        this._enabled = true;
        this.state = {};

        // TODO allow to set execArgv (for e.g. memory setting) for forked processes
        this._runner = fork('./runner.js', {
            args: [process.title, this._id, file].concat(process.argv),
            execArgv: [ '--max_old_space_size=' + config.tasks.memory ]
        });

        return new Proxy(this, {
            get: (obj, method) => obj[method] ? obj[method] : obj._runner[method]
        });
    }

    setState(jobId, state) {
        let job = this.state[jobId] = this.state[jobId] || {};
        if (job.state === 'running' && state !== 'running') {
            job.finished = Date.now();
        }
        if (job.state !== 'running' && state === 'running') {
            job.started = Date.now();
        }
        job.state = state;
    }

    get enabled() {
        return this._enabled;
    }

    set enabled(enabled) {
        if (this._enabled !== enabled) {
            this._runner.enable(enabled);
        }
        this._enabled = enabled;
    }

    get id() {
        return this._id;
    }

    get file() {
        return this._file;
    }

    get task() {
        return this._task;
    }

    kill() {
        this._runner._childProcess.kill();
    }
}

module.exports = exports = Worker;