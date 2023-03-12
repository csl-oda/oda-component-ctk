const Mocha = require('mocha')
const process = require('process')
const fs = require('fs')
const mochaOptions = require('./.mocharc.json')


let namespace = 'components' // default
if (process.env.NAMESPACE) {
  namespace = process.env.NAMESPACE
}

let header = '' // default
let numberOfArgs = 0
process.argv.forEach(function (val, index, array) {
  if ((val === '-n') || (val === '--namespace')) {
    numberOfArgs = numberOfArgs + 2
    if (array[index + 1]) {
      namespace = array[index + 1]
    } else {
      console.error('Please provide the namespace value after %s', val)
      process.exit(1)
    }
  }

  if ((val === '-H') || (val === '--header')) {
    numberOfArgs = numberOfArgs + 2
    if (array[index + 1]) {
      header = array[index + 1]
    } else {
      console.error('Please provide the header value after %s', val)
      process.exit(1)
    }
  }  
})

process.env.NAMESPACE = namespace
process.env.HEADER = header

// create an environment variable with list of components to test. Either find all components in components folder or the single component passed as a command-line arguement
if (process.argv.length > 2) {
  process.env.components = process.argv[2]
} else {
  // look for components folder at ../components and load all files with .component.yaml into environmnet variable
  const componentsFolder = './components/'
  const fileArray = []
  fs.readdirSync(componentsFolder).filter(fn => fn.endsWith('.yaml')).forEach(file => {
    fileArray.push('./components/' + file)
  })
  process.env.components = fileArray.join(',')
}

const mocha = new Mocha({
  ...mochaOptions,
  reporterOptions: {
    ...mochaOptions.reporterOptions,
    reportFilename: '[status]-Specific_dynamic-report',
    reportTitle: 'Component specific Dynamic CTK Report',
  },
})


mocha.addFile('L2-dynamicValidationTests.js')

// Run the test.
mocha.run(function (failures) {
  process.exitCode = failures ? 1 : 0 // exit with non-zero status if there were failures
})
