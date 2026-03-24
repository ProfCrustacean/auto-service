# UI Cookbook (SSR + Pico baseline)

Use these patterns for new server-rendered pages.

## Shell

```html
<main class="page-shell">
  <section class="panel row">...</section>
</main>
```

## Actions

```html
<div class="action-bar">
  <a class="btn primary" href="/appointments/new">Новая запись</a>
  <a class="btn" href="/dispatch/board">Диспетчерская доска</a>
</div>
```

## Callouts

```html
<section class="callout">Инфо</section>
<section class="callout warning">Предупреждение</section>
<section class="callout error">Ошибка</section>
```

## Tables

```html
<div class="table-wrap">
  <table>
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</div>
```

## Summary cards

```html
<div class="summary-grid">
  <article class="summary-card">
    <strong>Заголовок</strong>
    <span>Значение</span>
  </article>
</div>
```

## Forms

```html
<form class="row" method="post" action="/path">
  <div class="field-grid">
    <label>Поле<input type="text" name="field" /></label>
  </div>
  <button class="btn primary" type="submit">Сохранить</button>
</form>
```

## Search block

```html
<form class="search-form" method="get" action="/">
  <input class="search-input" type="search" name="q" />
  <button class="btn primary" type="submit">Найти</button>
</form>
```
