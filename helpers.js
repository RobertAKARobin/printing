"use strict";

var h = (function(){
  var publics = {
    is_browser: (typeof NodeList !== "undefined"),
    source    : "https://github.com/RobertAKARobin/helpers-js"
  };
  var HTMLentities = [
    ["\\&",   "&amp;"],
    ["\\<",   "&lt;"],
    ["\\>",   "&gt;"]
  ]
  var publicMethods = [
    ajax,
    capitalize,
    chain,
    collect,
    csv,
    el,
    extend,
    for_each,
    has_html_children,
    is_a,
    is_html_collection,
    load_static,
    pad,
    query_stringify,
    replaceEntities,
    select,
    serialize_form,
    tag,
    templatify,
    try_json
  ];
  for_each(publicMethods, function(method){
    publics[method.name] = method;
  });
  return publics;

  function ajax(options, callback){
    var request = new XMLHttpRequest();
    var url     = ((typeof options == "string") ? options : options.url);
    var method  = (options.method   || "GET").toUpperCase();
    var typeIn  = (options.typeIn   || "json").toLowerCase();
    var typeOut = (options.typeOut  || "json").toLowerCase();
    var data    = (options.data     || "");
    request.open(method, url, true);
    h.for_each(options.headers, function(header, value){
      request.setRequestHeader(header, value);
    });
    request.setRequestHeader("Content-Type", "application/" + typeIn);
    request.onreadystatechange = function(){
      var complete  = (request.readyState == 4);
      var httpCode  = request.status;
      var response  = request.responseText;
      if(complete && 200 <= httpCode && httpCode < 400){
        callback((typeOut === "json" ? try_json(response) : response), request);
      }
    }
    request.send(typeIn === "json" ? JSON.stringify(data) : query_stringify(data));
    return request;
  }
  function capitalize(string){
     return string.substring(0,1).toUpperCase() + string.substring(1);
  }
  function chain(events){
    var index = -1;
    function next(){
      index += 1;
      var event = events[index];
      if(event) event(next, arguments);
    }
    next();
  }
  function collect(collection, callback){
    var output = [];
    if(!collection) return;
    if(has_html_children(collection)) collection = collection.children;
    if(is_a(callback, Array)){
      h.for_each(callback, function(index){
        output.push(collection[index]);
      });
    }else h.for_each(collection, function(){
      output.push(callback.apply(null, arguments));
    });
    return output;
  }
  function csv(string){
    var output = [];
    var input = string.split(/\n/);
    for_each(input, function(line){
      line = line.trim();
      if(line) output.push(line.trim().split(/ *, */g));
    });
    return output;
  }
  function el(selector, ancestor){
    var out;
    selector = selector.trim();
    if(selector.substring(0,1) === "#"){
      out = document.getElementById(selector.substring(1));
    }else{
      out = (ancestor || document).querySelectorAll(selector);
    }
    return (out.length === 1 ? out[0] : out);
  }
  function extend(target, input){
    h.for_each(input, function(value, key){
      target[key] = value;
    });
  }
  function for_each(input, callback, whenAsyncDone){
    var i = 0, l, keys, key;
    if(typeof input == "undefined") return false;
    if(typeof input == "number") input = new Array(input);
    else if(typeof input == "string") input = input.split("");
    if(!(input instanceof Array) && !is_html_collection(input)){
      keys = Object.keys(input);
      if(keys.length === 0){
        input = [input];
        keys  = [0];
      }
    }
    l = (keys || input).length;
    if(whenAsyncDone){
      next();
    }else for(i; i < l; i++){
      key = keys ? keys[i] : i;
      if(callback(input[key], key) === "break") return "break";
    }
    function next(){
      key = keys ? keys[i] : i;
      if(i++ < l){
        if(callback(input[key], key, next) === "break") return "break";
      }else if(typeof whenAsyncDone == "function") whenAsyncDone();
    }
  }
  function has_html_children(input){
    if(!publics.is_browser) return false;
    else return (is_a(input, HTMLElement));
  }
  function templatify(template, inputVars){
    return template.replace(/\{\{(.*?)}}/g, function(nil, varName){
      return inputVars[varName]
    });
  }
  function is_a(input, prototype){
    var result = false;
    if(typeof prototype !== "undefined") result = (input instanceof prototype);
    if(!result) result = (typeof input === (prototype.name || "").toLowerCase())
    return result;
  }
  function is_html_collection(input){
    if(!publics.is_browser) return false;
    else return (is_a(input, NodeList) || is_a(input, HTMLCollection));
  }
  function query_stringify(input){
    var output = [];
    h.for_each(input, function(param, key){
      output.push([key, encodeURIComponent(param)].join("="));
    });
    return output.join("&");
  }
  function load_static(input, onProgress){
    var total;
    if(!is_a(input, Array)) input = [input];
    total = input.length;
    h.for_each(input, function(path, index){
      if(path.indexOf(".js") > -1) script_load(path);
      else if(path.indexOf(".css") > -1) style_load(path);
      if(onProgress) onProgress(total, index + 1);
    });
  }
  function pad(input, width, char, fromRight){
    var input = input.toString();
    var padding = new Array(Math.max(width - input.length + 1)).join(char || " ");
    if(fromRight) return padding + input;
    else return input + padding;
  }
  function replaceEntities(output){
    h.for_each(HTMLentities, function(matcher){
      output = output.replace(RegExp(matcher[0], "g"), matcher[1]);
    });
    return output;
  }
  function select(input, callback){
    var output = [];
    h.for_each(input, function(item){
      if(callback(item)) output.push(item);
    });
    return output;
  }
  function serialize_form(form, flatten){
    var inputs  = h.el("input,textarea,option", form);
    var data    = {};
    h.for_each(inputs, function(el){
      var isValid = true;
      var name    = (el.name    || el.parentElement.name);
      var type    = (el.type    || "").toUpperCase();
      var tagName = (el.tagName || "").toUpperCase();
      if(type == "RADIO" || type == "CHECKBOX" || tagName == "OPTION"){
         if(!el.checked && !el.selected) isValid = false;
      }
      if(!data[name]) data[name] = [];
      if(isValid) data[name].push(el.value);
    });
    if(flatten) h.for_each(data, function(value, key){
      if(value instanceof Array && value.length == 1) data[key] = value[0];
    });
    return data;
  }
  function tag(){
    var tag     = (this && this !== h) ? this : arguments[0];
    var content = arguments[1];
    var attrs, attrsArray = [];
    var output;
    if(h.is_a(tag, Array)){
      attrs     = tag[1];
      tag       = tag[0];
    }
    if(tag === "input") attrs.type = (attrs.type || "text");
    if(attrs && h.is_a(attrs, Object)){
      h.for_each(attrs, function(val, attr){
        attrsArray.push(attr + "=\"" + val + "\"");
      });
      attrs = attrsArray.join(" ");
    }
    output = "<" + tag + (attrs ? " " + attrs : "");
    if(tag === "input") output += " value=\"" + (content || "") + "\" />";
    else output += ">" + content + "</" + tag + ">";
    return output;
  }
  function try_json(string){
    string = string.trim();
    try{
      string = JSON.parse(string);
    }catch(err){
      try{
        string = string.replace(/\s+[\"\']?([^\n\r:,]+?)[\"\']?:/g, '"$1":');
        string = JSON.parse(string);
      }catch(err){}
    }
    return string;
  }

  function style_load(path){
    var link = document.createElement("LINK");
    link.setAttribute("rel", "stylesheet");
    window.addEventListener("load", function(){
      link.setAttribute("href", path);
      document.head.appendChild(link);
    });
  }
  function script_load(path){
    var script = document.createElement("SCRIPT");
    window.addEventListener("load", function(){
      script.setAttribute("src", path);
      document.head.appendChild(script);
    });
  }
})();

if(typeof module !== "undefined") module.exports = h;
