# Action: GitHub Asset Upload

```yaml
- name: Upload asset
  uses: k15g/action-github-asset-upload@v1
  if: startsWith(github.ref, 'refs/tags/v')
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    file: distribution.tar.gz
    label: Distribution
```
