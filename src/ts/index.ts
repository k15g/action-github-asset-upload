import * as core from '@actions/core'
import { getOctokit } from '@actions/github'
import * as mime from 'mime-types'
import * as path from 'path'
import * as fs from 'fs'

const ref_matcher = new RegExp('^refs/tags/(.+)$')

async function run() {
    // Load GitHub client
    const token = core.getInput('token')
    const octokit = getOctokit(token)
    const github = getOctokit(token).rest

    // Load inputs
    const file = core.getInput('file', { required: true })
    const name = core.getInput('name') || path.basename(file)
    const content_type = core.getInput('type') || mime.lookup(name) || 'application/octet-stream'
    const label = core.getInput('label') || undefined

    // Get reference
    const ref = process.env.GITHUB_REF

    if (!ref.match(ref_matcher))
        return core.setFailed('Provided GITHUB_REF is not a tag reference')

    // Get tag
    const [, tag] = ref.match(ref_matcher)

    // Get owner and repo
    const [, owner, repo] = process.env.GITHUB_REPOSITORY.match(/^(.+)\/(.+)$/)

    // Check existence of file
    if (!fs.existsSync(file))
        return core.setFailed(`File '${file}' not found`)

    // Load release
    github.repos.getReleaseByTag({ owner, repo, tag }).then(release => {
        const release_id = release.data.id

        // Read file
        const data = fs.readFileSync(file) as any as string

        // Upload file
        github.repos.uploadReleaseAsset({ owner, repo, release_id, name, data, label, headers: { 'Content-Type': content_type } }).then(upload => {
            // Set outputs
            core.setOutput('id', upload.data.id)
            core.setOutput('url', upload.data.url)
            core.setOutput('state', upload.data.state)
            core.setOutput('browser_download_url', upload.data.browser_download_url)

            core.info("Successful upload")
        }).catch(err => {
            if (err.response.data.errors) {
                switch (err.response.data.errors[0].code) {
                    case 'already_exists':
                        core.setFailed('File already exists')
                        break
                    default:
                        core.setFailed(`Error during upload: ${err.response.data.errors[0].code}`)
                        break
                }
            } else {
                core.setFailed(`Error during upload: ${err}`)
            }
        })
    }).catch(err => {
        core.setFailed(`Error during release fetching: ${err}`)
    })
}

run()
