const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const chai = require('chai');
const async = require('async');
const _envHash = require('../lib');
const Murmur = require('imurmurhash');

chai.config.includeStack = true;
const assert = chai.assert;

const envHash = _envHash.envHash;
const hashFileSystemDataLists = _envHash.hashFileSystemDataLists;
const readFileData = _envHash.readFileData;
const readDirectoryData = _envHash.readDirectoryData;

describe('env-hash', () => {
  const fileRoot = path.join(__dirname, 'node_env_cache_test_files');
  const file1 = path.join(fileRoot, 'file1.txt');
  const file2 = path.join(fileRoot, 'file2.txt');

  const dirRoot = path.join(__dirname, 'node_env_cache_test_dirs');
  const dir1 = path.join(dirRoot, 'dir1');
  const dir1a = path.join(dir1, 'a');
  const dir1b = path.join(dir1, 'b');
  const dir2 = path.join(dirRoot, 'dir2');
  const dir2a = path.join(dir2, 'a');

  // Ensure that data is refreshed on every test
  function setupFiles(cb) {
    rimraf(fileRoot, (err) => {
      if (err) return cb(err);
      mkdirp(fileRoot, (err) => {
        if (err) return cb(err);

        async.parallel([
          (cb) => fs.writeFile(file1, 'test1', cb),
          (cb) => fs.writeFile(file2, 'test2', cb),
          (cb) => mkdirp(dir1, (err) => {
            if (err) return cb(err);

            async.map(
              [dir1a, dir1b],
              (dir, cb) => mkdirp(dir, cb),
              cb
            );
          }),
          (cb) => mkdirp(dir2, (err) => {
            if (err) return cb(err);

            async.map(
              [dir2a],
              (dir, cb) => mkdirp(dir, cb),
              cb
            );
          })
        ], (err) => {
          if (err) return cb(err);
          cb();
        });
      });
    });
  }

  // Ensure that data is refreshed on every test
  function setupDirs(cb) {
    rimraf(dirRoot, (err) => {
      if (err) return cb(err);
      mkdirp(dirRoot, (err) => {
        if (err) return cb(err);

        async.parallel([
          (cb) => mkdirp(dir1, (err) => {
            if (err) return cb(err);

            async.map(
              [dir1a, dir1b],
              (dir, cb) => mkdirp(dir, cb),
              cb
            );
          }),
          (cb) => mkdirp(dir2, (err) => {
            if (err) return cb(err);

            async.map(
              [dir2a],
              (dir, cb) => mkdirp(dir, cb),
              cb
            );
          })
        ], (err) => {
          if (err) return cb(err);
          cb();
        });
      });
    });
  }

  describe('#readFileData', () => {
    beforeEach(setupFiles);

    it('should should produce a data set reflecting the content and mtimes of a list of files', () => {
      return readFileData([file1, file2]).then(data => {
        assert.deepEqual(
          data,
          [
            ['test1', fs.statSync(file1).mtime.getTime()],
            ['test2', fs.statSync(file2).mtime.getTime()]
          ]
        );
      });
    });
  });
  describe('#readDirectoryData', () => {
    beforeEach(setupDirs);

    it('should should produce a data set reflecting the contents of a list of directories', () => {
      return readDirectoryData([dir1, dir2]).then(data => {
        assert.deepEqual(
          data,
          [
            [dir1a, fs.statSync(dir1a).mtime.getTime()],
            [dir1b, fs.statSync(dir1b).mtime.getTime()],
            [dir2a, fs.statSync(dir2a).mtime.getTime()]
          ]
        );
      });
    });
  });
  describe('#hashFileSystemDataLists', () => {
    it('should should produce a hash reflecting the provided data', () => {
      const data = [['test1', 10], ['test2', 20]];

      assert.equal(
        hashFileSystemDataLists(data),
        new Murmur('test1').hash('10').hash('test2').hash('20').result()
      );
    });
    it('should produce an empty string for no data', () => {
      assert.equal(hashFileSystemDataLists([]), '');
    });
  });
  describe('#envHash', () => {
    it('should produce a string representing the hash of the environment', () => {
      const files = [file1, file2];
      const directories = [dir1, dir2];

      return envHash({files: files, directories: directories}).then(hash => {
        return Promise.all([
          readFileData(files),
          readDirectoryData(directories)
        ]).then(data => {
          assert.equal(
            hashFileSystemDataLists(data[0]) + '_' + hashFileSystemDataLists(data[1]),
            hash
          );
        });
      });
    });
  });
});