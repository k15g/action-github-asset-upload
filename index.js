"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const github_1 = require("@actions/github");
const mime = require("mime-types");
const path = require("path");
const fs = require("fs");
const ref_matcher = new RegExp('^refs/tags/(.+)$');
async function run() {
    const token = core.getInput('token');
    const octokit = github_1.getOctokit(token);
    const github = github_1.getOctokit(token).rest;
    const file = core.getInput('file', { required: true });
    const name = core.getInput('name') || path.basename(file);
    const content_type = core.getInput('type') || mime.lookup(name) || 'application/octet-stream';
    const label = core.getInput('label') || undefined;
    if (!fs.existsSync(file))
        return core.setFailed(`File '${file}' not found`);
    const ref = process.env.GITHUB_REF;
    if (!ref.match(ref_matcher))
        return core.warning(`Provided GITHUB_REF is not a tag reference, add "if: startsWith(github.ref, 'refs/tags/')" to skip this action when not build a tag.`);
    const [, tag] = ref.match(ref_matcher);
    const [, owner, repo] = process.env.GITHUB_REPOSITORY.match(/^(.+)\/(.+)$/);
    github.repos.getReleaseByTag({ owner, repo, tag }).then(release => {
        const release_id = release.data.id;
        const data = fs.readFileSync(file);
        github.repos.uploadReleaseAsset({ owner, repo, release_id, name, data, label, headers: { 'Content-Type': content_type } }).then(upload => {
            core.setOutput('id', upload.data.id);
            core.setOutput('url', upload.data.url);
            core.setOutput('state', upload.data.state);
            core.setOutput('browser_download_url', upload.data.browser_download_url);
            core.info("✅ Successful upload");
        }).catch(err => {
            if (err.response.data.errors) {
                switch (err.response.data.errors[0].code) {
                    case 'already_exists':
                        core.setFailed('File already exists');
                        break;
                    default:
                        core.setFailed(`Error during upload: ${err.response.data.errors[0].code}`);
                        break;
                }
            }
            else {
                core.setFailed(`Error during upload: ${err}`);
            }
        });
    }).catch(err => {
        core.setFailed(`Error during release fetching: ${err}`);
    });
}
run();
