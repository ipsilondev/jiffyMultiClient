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
		} else if(options.transportHTTP == 'axios') {
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
			return this.sendWebsocket('get', path, data);
		}else {
			return this.transportHTTP('get', path, data);
		}
	}
	this.post = function(path, data = {}, ioDisable = false) {
		if(ioDisable != true && this.wsReady == true) {
			return this.sendWebsocket('post', path, data);
		}else {
			return this.transportHTTP('post', path, data);
		}		
	}
	this.fetchTransport = function(method, path, data) {
		var url = this.baseURL + path;
		var obj = {method: method.toUpperCase()};
		if (method == 'get') {
			url += "?1=1";
			Object.keys(data).forEach(function (item, index) {
				url += '&' + item + "=" + data[item];
				});
		} else {
			obj.body = data;
		}
		return fetch(url, obj, data);
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
		if(options == null || options == undefined) {
			options = {};
		}
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
			if(typeof io != 'undefined' || typeof module != 'undefined') {
				this.initSocketObject();
			} else {
				var script = document.createElement('script');
				script.type = 'text/javascript';
				script.async = true;
				script.onload = () => {
					this.initSocketObject();
					};
				script.src = this.optionsIO.url + '/socket.io/socket.io.js';
				document.getElementsByTagName('head')[0].appendChild(script);
			}
		}
	}
	this.onloadSocketIO = function() {
		this.initSocketObject();
	}
	this.sendWebsocket = function (method, path, data) {
		return new Promise((resolve, reject) => {
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
		if(typeof module != 'undefined') {
		this.io = require('socket.io-client')(this.optionsIO.url);
		} else {
		this.io = io(this.optionsIO.url);
		}
		this.io.on('res', (d) => {
			this.processRes(d);
			});
		this.wsReady = true;
	}
	this.processRes = function(data) {
			if(this.transportEmulate == 'axios') {
				if(data.data instanceof ArrayBuffer) {
					data.data = new Blob([new Uint8Array(data.data)], {type: 'application/octet-stream'});
				}
				this.wsReqCollection[data.timestamp + '/' + data.path].resolve(data);
				this.eraseWSItem(data.timestamp + '/' + data.path);
			} else {
				this.wsReqCollection[data.timestamp + '/' + data.path].resolve(
				{data: data.data, 
				json: () => { return new Promise((resolve, reject) => { 
					if(typeof data.data === 'string') {
						data.data = JSON.parse(data.data);
					}
					resolve(data.data); this.eraseWSItem(data.timestamp + '/' + path); }); }, 
				text: () => { return new Promise((resolve, reject) => { 
					if(typeof data.data === 'object') { 
						data.data = JSON.stringify(data.data);
					}
					resolve(data.data); 
					this.eraseWSItem(data.timestamp + '/' + path);
				}); }, 
				blob: () => { return new Promise((resolve, reject) => {				
					resolve(new Blob([new Uint8Array(data.data)], {type: 'application/octet-stream'}));
					//in case you may want to get base64 from bindary data, use the line below
					//resolve(btoa(String.fromCharCode.apply(null, new Uint8Array(data.data))));
					this.eraseWSItem(data.timestamp + '/' + path); }); },
				raw: () => { return new Promise((resolve, reject) => { 
					resolve(data.data); 
					this.eraseWSItem(data.timestamp + '/' + path); }); }					  
				});				
			}								
	}
	this.eraseWSItem = function (i) {
		this.wsReqCollection[i] = null;
	}
	
}
if(typeof module != 'undefined') {
module.exports = jiffyMultiClient;
}
