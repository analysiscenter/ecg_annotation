import Server from './server'
import EcgStore from './ecg_store'

const server = new Server()
server.init()
const ecgStore = new EcgStore(server)

export { server, ecgStore }
