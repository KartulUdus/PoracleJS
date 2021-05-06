class PromiseQueue {
	constructor(tasks = [], concurrentCount = 1) {
		this.todo = tasks
		this.running = []
		this.count = concurrentCount
	}

	runNext() {
		return ((this.running.length < this.count) && this.todo.length)
	}

	run(fn, errfn) {
		while (this.runNext()) {
			const promise = fn(this.todo.shift()).then(() => {
				this.running.shift()
				this.run(fn)
			}).catch((err) => {
				if (errfn) errfn(err).catch(() => {})
				this.running.shift()
				this.run(fn)
			})
			this.running.push(promise)
		}
	}
}

module.exports = PromiseQueue