/* global Modernizr __moduleName */
import './modernizr';
import isEmpty from 'lodash/lang/isEmpty';
import isString from 'lodash/lang/isString';
import isUndefined from 'lodash/lang/isUndefined';
import reqwest from 'reqwest';
import url from 'url';

let urlBase;

const importSass = new Promise((resolve, reject) => {
  if (Modernizr.webworkers) {
    System.import('sass.js/dist/sass', __moduleName).then(Sass => {
      resolve(new Sass());
    }).catch(err => reject(err));
  } else {
    System.import('sass.js/dist/sass.sync', __moduleName).then(Sass => {
      resolve(Sass);
    }).catch(err => reject(err));
  }
});


// intercept file loading requests (@import directive) from libsass
importSass.then(sass => {
  sass.importer((request, done) => {
    const { current } = request;
    // Currently only supporting scss imports due to
    // https://github.com/sass/libsass/issues/1695
    const importUrl = url.resolve(urlBase, `${current}.scss`);
    const partialUrl = importUrl.replace(/\/([^/]*)$/, '/_$1');
    let content;
    reqwest(partialUrl)
      .then(resp => {
        // In Cordova Apps the response is the raw XMLHttpRequest
        content = resp.responseText ? resp.responseText : resp;
        return content;
      })
      .catch(() => reqwest(importUrl))
      .then(resp => {
        content = resp.responseText ? resp.responseText : resp;
        return content;
      })
      .then(() => done({ content }));
  });
});


const compile = scss => {
  return new Promise((resolve, reject) => {
    importSass.then(sass => {
      const content = scss.content;
      if (isString(content) && isEmpty(content) ||
          !isUndefined(content.responseText) && isEmpty(content.responseText)) {
        return resolve('');
      }
      sass.compile(content, scss.options, result => {
        if (result.status === 0) {
          const style = document.createElement('style');
          style.textContent = result.text;
          style.setAttribute('type', 'text/css');
          document.getElementsByTagName('head')[0].appendChild(style);
          resolve('');
        } else {
          reject(result.formatted);
        }
      });
    });
  });
};

export default load => {
  urlBase = load.address;
  const indentedSyntax = urlBase.endsWith('.sass');
  // load initial scss file
  return reqwest(urlBase)
    // In Cordova Apps the response is the raw XMLHttpRequest
    .then(resp => {
      return {
        content: resp.responseText ? resp.responseText : resp,
        options: { indentedSyntax },
      };
    })
    .then(compile);
};
