import React from 'react';
import ReactDOM from 'react-dom';
// import { addPlugin } from 'helux';
// import { HeluxPluginReduxDevtool } from 'helux-plugin-redux-devtool';
import './index.css';
import App from './App';

// addPlugin(HeluxPluginReduxDevtool);

let rootNode = document.getElementById('root') as HTMLElement;
if (!rootNode) {
  const div = document.createElement('div');
  div.id = 'root';
  document.body.appendChild(div);
  rootNode = div;
}

function renderBy16() {
  ReactDOM.render(<App />, rootNode);
}

renderBy16();
