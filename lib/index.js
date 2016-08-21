const path = require('path');
const fs = require('fs');
const Murmur = require('imurmurhash');
const _ = require('lodash');

function join(root, file) {
  if (path.isAbsolute(file)) {
    return file;
  } else {
    return path.join(root, file);
  }
}

function getContent(file) {
  return new Promise((res, rej) => {
    fs.readFile(file, 'utf8', (err, content) => {
      if (err) {
        err.message = `${file} - ${err.message}`;
        return rej(err);
      }
      res(content);
    });
  });
}

function getModifiedTime(file) {
  return new Promise((res, rej) => {
    fs.stat(file, (err, stat) => {
      if (err) {
        err.message = `${file} - ${err.message}`;
        return rej(err);
      }
      res(stat.mtime.getTime());
    });
  });
}

function getDirectoryContents(directory) {
  return new Promise((res, rej) => {
    fs.readdir(directory, (err, dirs) => {
      if (err) {
        err.message = `${directory} - ${err.message}`;
        return rej(err);
      }
      res(dirs);
    });
  });
}

function readFileData(files) {
  return Promise.all([
    Promise.all(files.map(getContent)),
    Promise.all(files.map(getModifiedTime))
  ]).then(data => _.zip(...data));
}

function readDirectoryData(directories) {
  return Promise
    .all(directories.map(getDirectoryContents))
    .then(lists => Promise.all(
      lists.map((contents, i) => {
        const root = directories[i];
        return Promise.all(
          contents.map(item => {
            const absPath = path.join(root, item);
            return getModifiedTime(absPath).then(mtime => [absPath, mtime]);
          })
        );
      })
    ))
    .then(lists => _.flatten(lists));
}

function hashFileSystemDataLists(data) {
  if (!data.length) {
    return '';
  }

  const hash = new Murmur(data[0][0]);

  data.forEach((entry, i) => {
    // On the first iteration, skip the first cell as we applied it above
    if (i !== 0) {
      hash.hash(entry[0]);
    }
    hash.hash(String(entry[1]));
  });

  return hash.result();
}

function getOptions(overrides) {
  overrides = overrides || {};

  return {
    root: overrides.root || process.cwd(),
    files: overrides.files || ['package.json'],
    directories: overrides.directories || ['node_modules']
  };
}

function envHash(options) {
  options = getOptions(options);

  const {root} = options;
  let {files, directories} = options;

  files = files.map(file => join(root, file));
  directories = directories.map(dir => join(root, dir));

  return Promise.all([
    readFileData(files),
    readDirectoryData(directories)
  ])
    .then((data) => data.map(hashFileSystemDataLists).join('_'));
}


module.exports = {
  'default': envHash,
  envHash: envHash,
  readDirectoryData: readDirectoryData,
  readFileData: readFileData,
  hashFileSystemDataLists: hashFileSystemDataLists
};