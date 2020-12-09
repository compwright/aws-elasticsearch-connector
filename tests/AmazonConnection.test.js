'use strict'

const assert = require('assert')
const { URL } = require('url')
const { Connection } = require('@elastic/elasticsearch')
const AWS = require('aws-sdk')

const awsConfig = new AWS.Config({
  accessKeyId: 'foo',
  secretAccessKey: 'bar',
  sessionToken: 'baz'
})

const AmazonConnection = require('../src/AmazonConnection')(awsConfig)

describe('AmazonConnection', function () {
  it('extends Connection', function () {
    assert(AmazonConnection.prototype instanceof Connection)
  })

  describe('buildRequestObject()', function () {
    const connector = new AmazonConnection({
      url: new URL('https://foo.us-east-1.es.amazonaws.com')
    })

    it('sets the Host header without the port appended', function () {
      const req = connector.buildRequestObject({
        method: 'GET',
        path: '/_cluster/health',
        query: {},
        body: undefined,
        headers: {}
      })

      assert.strictEqual(req.headers.host, 'foo.us-east-1.es.amazonaws.com')
    })

    it('sets the content-length: 0 header when there is no body', function () {
      const req = connector.buildRequestObject({
        method: 'POST',
        path: '/_cluster/health',
        query: {},
        body: '',
        headers: {}
      })

      assert.strictEqual(req.headers['content-length'], 0)
    })

    it('sets the content-length header when there is a body', function () {
      const req = connector.buildRequestObject({
        method: 'POST',
        path: '/_cluster/health',
        query: {},
        body: 'foo',
        headers: {}
      })

      assert.strictEqual(req.headers['content-length'], 3)
      assert.strictEqual(req.body, 'foo')
    })

    it('signs the request', function () {
      const req = connector.buildRequestObject({
        method: 'POST',
        path: '/_cluster/health',
        query: {},
        body: 'foo',
        headers: {
          Date: new Date('2019-08-16T20:51:18Z').toISOString()
        }
      })

      assert.strictEqual(req.headers['X-Amz-Date'], '20190816T205118Z')
      assert.strictEqual(req.headers.Authorization, 'AWS4-HMAC-SHA256 Credential=foo/20190816/us-east-1/es/aws4_request, SignedHeaders=content-length;content-type;date;host;x-amz-date;x-amz-security-token, Signature=5daf2e5d70fe61002e12ad3d4d8dcfcda64bb477ce764af1c30967393d83ba1f')
    })

    it('sets the region when region is configured in the AWS config object', function () {
      const regionConfig = new AWS.Config({
        accessKeyId: 'foo',
        region: 'us-west-2',
        secretAccessKey: 'bar',
        sessionToken: 'baz'
      })

      const RegionConnection = require('../src/AmazonConnection')(regionConfig)

      const regionConnector = new RegionConnection({
        url: new URL('https://foo.us-west-2.es.amazonaws.com')
      })

      const req = regionConnector.buildRequestObject({
        method: 'POST',
        path: '/_cluster/health',
        query: {},
        body: 'foo',
        headers: {
          Date: new Date('2019-08-16T20:51:18Z').toISOString()
        }
      })

      assert.strictEqual(req.region, 'us-west-2')
    })
  })
})
