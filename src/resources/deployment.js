const { getApiVersion } = require('../apiVersionMap')
const { createContainer } = require('./container')
const expressionParser = require('../expressionParser')
const { createVolumes } = require('./volume')
const { createVolumeClaims } = require('./volumeClaim')

function createDeployment (config) {
  const container = createContainer(config)
  const volumes = createVolumes(config)
  const volumeClaims = createVolumeClaims(config)
  const metadata = expressionParser.parseMetadata(config.metadata || '') || {}
  const definition = {
    deployment: {
      apiVersion: getApiVersion(config, 'deployment'),
      kind: 'Deployment',
      metadata: {
        namespace: config.namespace,
        name: config.name
      },
      spec: {
        replicas: config.scale ? config.scale.containers : 1,
        revisionHistoryLimit: config.deployment.history,
        strategy: {
          rollingUpdate: {
            maxUnavailable: config.deployment.unavailable,
            maxSurge: config.deployment.surge
          }
        },
        selector: {
          matchLabels: {
            app: config.name
          }
        },
        template: {
          metadata: {
            labels: {
              app: config.name
            }
          },
          spec: {
            containers: [ container ],
            volumes: volumes
          }
        },
        volumeClaimTemplates: volumeClaims
      }
    }
  }

  if (config.deployment.deadline) {
    definition.deployment.spec.progressDeadlineSeconds = config.deployment.deadline
  }
  if (config.deployment.ready) {
    definition.deployment.spec.minReadySeconds = config.deployment.ready
  }
  if (config.security && config.security.account) {
    definition.deployment.spec.template.serviceAccountName = config.security.account
  }

  const labels = expressionParser.parseMetadata(config.labels || '') || {}
  if (Object.keys(labels).length) {
    Object.assign(definition.deployment.spec.template.metadata.labels, labels)
  }
  Object.assign(definition.deployment.metadata, metadata || {})
  return definition
}

module.exports = {
  createDeployment: createDeployment
}