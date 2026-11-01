# What the model got wrong (fixture)

Plain paragraph with **bold**, *emphasis* and `inline code`.

<script>window.__pwned = 1</script>

<img src="x" onerror="window.__pwned = 2">

<iframe src="https://example.invalid/"></iframe>

<style>body { display: none }</style>

<div onclick="window.__pwned = 3" style="position:fixed">raw div</div>

[safe link](https://example.com/page)

[js link](javascript:window.__pwned=4)

[data link](data:text/html,<script>window.__pwned=5</script>)

[mixed case](JaVaScRiPt:window.__pwned=6)

[protocol relative](//evil.example/x)

- list item one
- list item two

| a | b |
|---|:-:|
| 1 | 2 |

> a quote

```
fenced code
```
