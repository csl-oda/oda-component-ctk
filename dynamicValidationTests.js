/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
const fs = require('fs')
const chai = require('chai')
const chaiHttp = require('chai-http')
const YAML = require('yaml')
const process = require('process')
const k8s = require('@kubernetes/client-node')

chai.use(chaiHttp)
const expect = chai.expect

const COMPONENT = 'component'

const kc = new k8s.KubeConfig()
kc.loadFromDefault()

console.log('***************************************************************************')
console.log('Open Digital Architecture - Component Test Kit CTK Dynamic Tests')
console.log('***************************************************************************')
console.log()

const components = process.env.components.split(',')
for (const index in components) {
  const componentEnvelopeName = components[index]
  let documentArray = []
  const file = fs.readFileSync(componentEnvelopeName, 'utf8')
  documentArray = YAML.parseAllDocuments(file)
  const componentDoc = getComponentDocument(documentArray)
  const metadata = componentDoc.get('metadata')
  const componentName = metadata.get('name')
  const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api)
  const k8sCustomApi = kc.makeApiClient(k8s.CustomObjectsApi)

  describe('Step 0: Basic environment connectivity tests', function () {
    it('Kubectl configured correctly', function (done) {
      k8sCoreApi.listNamespacedPod('components').then((res) => {
        expect(res, "Kubectl should return pods in 'components' namespace").to.be.a('object')
        done()
      })
    })
  })

  describe('Step 1: Check metadata for component ' + componentEnvelopeName, function () {
    it('Component can be found', function (done) {
      k8sCustomApi.listNamespacedCustomObject('oda.tmforum.org', 'v1alpha1', 'components', 'components', undefined, undefined, 'metadata.name=' + componentName)
        .then(function (res) {
          const numberOfComponentsFound = res.body.items.length
          expect(numberOfComponentsFound, 'Should find 1 component with name ' + componentName).to.equal(1)
          done()
        }).catch(done)
    })

    it('Component has deployed successfully (deployment_status: Complete)', function (done) {
      k8sCustomApi.listNamespacedCustomObject('oda.tmforum.org', 'v1alpha1', 'components', 'components', undefined, undefined, 'metadata.name=' + componentName)
        .then(function (res) {
          const status = res.body.items[0].status
          expect(status.deployment_status, 'status.deployment_status is Complete').to.equal('Complete')
          done()
        }).catch(done)
    })
  })

  // get list of exposed APIs
  k8sCustomApi.listNamespacedCustomObject('oda.tmforum.org', 'v1alpha1', 'components', 'components', undefined, undefined, 'metadata.name=' + componentName).then(function (res) {
    const status = res.body.items[0].status
    const exposedAPIList = status.exposedAPIs
    for (const apiKey in exposedAPIList) {
      describe('Step 2(' + apiKey + '): Run-time test of exposed API: ' + exposedAPIList[apiKey].name, function () {
        it('endpoints give HTTP 200 response', function (done) {
          expect(exposedAPIList[apiKey].url, 'status.exposedAPI[' + apiKey + '].url should be a string').to.be.a('string')
          const server = exposedAPIList[apiKey].url.split('/')[0]
          const apiPath = '/' + exposedAPIList[0].url.split(/\/(.+)/)[1]
          chai.request('http://' + server)
            .get(apiPath)
            .end(function (err, res) {
              expect(err).to.be.null
              expect(res).to.have.status(200)
              done()
            })
        })
      })
    }
  })
}

function getComponentDocument (inDocumentArray) {
  // go through each document checking for a kind: component
  for (const docKey in inDocumentArray) {
    if (inDocumentArray[docKey].get('kind') === COMPONENT) {
      return inDocumentArray[docKey]
    }
  }
  return null
};