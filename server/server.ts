import * as Hapi from 'hapi';
import * as Inert from 'inert';
import { exec } from 'child_process';

import { routes as osUsageRoutes } from './api/os-usage';

var isWin = /^win/.test(process.platform);

// Default app config. 
// Depending on the properties, it will be used for the connection properties or 
var defaultCfg = {
	//host: 'localhost',    // connection host (if we do this only does not work when deployed)
	port: 8080,			    // connection port
	clientRoot: process.cwd() + '/web/', // root of the client files (which will be served statically)	
	routes: {
		cors:
		{
			origin: ['*'],
			additionalHeaders: ["Accept-language"]
		}
	}
};


// App is a simple convenience Hapi/Server wrapper. 
class Server {
	cfg: any;
	hapiServer: any;

	async init(cfg: any) {

		this.cfg = Object.assign({}, defaultCfg, cfg);

		this.hapiServer = new Hapi.Server();

		// register plugins
		this.hapiServer.register(Inert, function () { });

		// start server
		this.hapiServer.connection({ host: this.cfg.host, port: this.cfg.port });

		// Bind static files to Inert plugin (this will server )
		this.hapiServer.route({
			method: '*',
			path: '/{path*}',
			handler: {
				directory: {
					path: (request: any) => {
						console.log(' > ' + new Date().getTime() + ' ' + request.method.toUpperCase() + ' ' + request.path);
						return this.cfg.clientRoot;
					},
					listing: true,
					index: ['index.html', 'default.html']
				}
			}
		});

		// load the osUsage API routes
		this.load(osUsageRoutes);
	}

	// Load hapi route array 
	load(routes: any[]) {
		if (typeof routes === 'undefined' || !(routes instanceof Array)) {
			throw new Error("App - cannot load routes " + routes);
		}

		for (var route of routes) {
			this.hapiServer.route(route);
		}
	}

	start() {
		// Start the server
		this.hapiServer.start((err: any) => {

			if (err) {
				throw err;
			}

			// open browser
			if (isWin) {
				exec('start http://localhost:' + this.cfg.port, function (error, stdout, stderr) { });
			} else {
				exec('open http://localhost:' + this.cfg.port, function (error, stdout, stderr) { });
			}

			console.log('Server running at:', this.hapiServer.info.uri);
		});
	}
}


export const server = new Server();