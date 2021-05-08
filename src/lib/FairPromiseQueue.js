class FairPromiseQueue {
	constructor(tasks = [], concurrentCount = 1, selector) {
		this.todo = tasks
		this.running = []
		this.count = concurrentCount
		this.busyDestinations = {}
		this.selector = selector
	}

	runNext() {
		return ((this.running.length < this.count) && this.todo.length)
	}

	run(fn, errfn) {
		while (this.runNext()) {
			let i = 0
			let selectedKey
			while (i < this.todo.length) {
				const key = this.selector(this.todo[i])
				if (!this.busyDestinations[key]) {
					selectedKey = key
					break
				}
				i++
			}
			if (selectedKey) {
				const queueEntry = this.todo.splice(i, 1)[0]

				this.busyDestinations[selectedKey] = true
				const promise = fn(queueEntry).then(() => {
					this.busyDestinations[selectedKey] = false
					this.running.shift()
					this.run(fn, errfn)
				}).catch((err) => {
					this.busyDestinations[selectedKey] = false
					this.running.shift()
					if (errfn) errfn(err).catch(() => {})
					this.run(fn, errfn)
				})
				this.running.push(promise)
			} else {
				break
			}
		}
	}
}

module.exports = FairPromiseQueue