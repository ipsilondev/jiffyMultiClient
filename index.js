function jiffyMultiClient () {
	this.transportHTTP = 'fetch';
	this.transportEmulate = 'fetch';
	this.axiosInstance = null;
	this.baseURL = '/';
	this.wsReady = false;
	this.io = null;
	this.optionsIO = {};
	this.wsReqCollection = {};	
	this.init = function (options) {
		if(options.transportHTTP == 'fetch') {
			this.transportHTTP = this.fetchTransport;
			this.transportEmulate = 'fetch';
		} else if(options.reqFramework == 'axios') {
			this.transportHTTP = this.axiosTransport;
			this.transportEmulate = 'axios';
		} else {
			this.transportHTTP = this.axiosInstanced;
			this.transportEmulate = 'axios';
		}
		if(options.baseURL[options.baseURL.length - 1] == '/') {
			options.baseURL = options.baseURL.substr(0, options.baseURL.length -2);
		} 
		this.baseURL = options.baseURL;		
	}
	this.get = function(path, data = {}, ioDisable = false) {
		if(ioDisable != true && this.wsReady == true) {
			this.sendWebsocket('get', path, data);
		}else {
			this.transportHTTP('get', path, data);
		}
	}
	this.post = function(path, data = {}, ioDisable = false) {
		if(ioDisable != true && this.wsReady == true) {
			this.sendWebsocket('post', path, data);
		}else {
			this.transportHTTP('post', path, data);
		}		
	}
	this.fetchTransport = function(method, path, data) {
		return fetch(this.baseURL + path, {method: method.toUpperCase(), body: data});
	}
	this.axiosTransport = function(method, path, data) {
		if(method == 'get') {
			return axios.get(this.baseURL + path, data);
		} else {
			return axios.post(this.baseURL + path, data);			
		}
	}
	this.axiosInstanced = function(method, path, data) {
		if(method == 'get') {
			return this.axiosInstance.get(path, data);
		} else {
			return this.axiosInstance.post(path, data);			
		}
	}
	//options.url = websocket server url (where we connect and where we load the socket.io file in case is not loaded yet. if is not passed, same as http server will be used
	//options.ioOptions = options to pass to socket.io
	//options.io = in case you already have an io connection, overwrite the local one	
	this.initWebsocket = function (options) {
		if(options.io != null && options.io != undefined) {
			this.io = options.io;
		} else {
			this.optionsIO = options;
			if(this.optionsIO.url != null && this.optionsIO.url != undefined){
				if(this.optionsIO.url[this.optionsIO.url.length - 1] == '/') {
					this.optionsIO.url = this.optionsIO.url.substr(0, this.optionsIO.url.length - 2);
				}
			} else {
				this.optionsIO.url = this.baseURL;
			}
			if(io != null && io != undefined) {
				this.initSocketObject();
			} else {
				var script = document.createElement('script');
				script.type = 'text/javascript';
				script.async = true;
				script.onload = this.onloadSocketIO;
				script.src = this.optionsIO.url + '/socket.io/socket.io.js';
				document.getElementsByTagName('head')[0].appendChild(script);
			}
		}
	}
	this.onloadSocketIO = function() {
		this.initSocketObject();
	}
	this.sendWebsocket = function (method, path, data) {
		new Promise(function(resolve, reject) {
		var timestamp = Date.now();
		this.wsReqCollection[timestamp + '/' + method + path] = {path: path, method: method, timestamp: timestamp, data: data, resolve: resolve, reject: reject};
		if(data.reqPathServer != null && data.reqPathServer != null) {
			data.reqPathServer99 = {timestamp: timestamp, path: method + path};
		} else {
			data.reqPathServer = {timestamp: timestamp, path: method + path};			
		}
		this.io.emit("req", data);			
		});
	}
	this.initSocketObject = function() {
		this.io = io(this.optionsIO.url);
		this.on('res', this.processRes);
	}
	this.processRes = function(data) {
		if(data.code == 404) {
			this.wsReqCollection[data.timestamp + '/' + path].reject(data);
		} else {
			if(this.transportEmulate == 'axios') {
				if(data.type == 'binary') {
					data.data = new Uint8Array(this.data.data);
				}
				this.wsReqCollection[data.timestamp + '/' + path].resolve(data.data);
			} else {
				this.wsReqCollection[data.timestamp + '/' + path].resolve(
				{data: data, 
				json: () => { return new Promise((resolve, reject) => { resolve(this.data.data); }); }, 
				text: () => { return new Promise((resolve, reject) => { 
					if(typeof this.data.data === 'object') { 
						this.data.data = JSON.stringify(this.data.data);
					}
					resolve(this.data.data); 
				}); }, 
				blob: () => { return new Promise((resolve, reject) => { resolve(new Uint8Array(this.data.data)); }); }  
				});				
			}
						
		}
	}
	
}
