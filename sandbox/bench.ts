import { html, signal, type Signal, batch, For, mount, type VNode } from "@hellajs/core";

const { div, table, tbody, tr, td, button, span, a, h1 } = html;

const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
const colors = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

const random = (max: number) => Math.round(Math.random() * 1000) % max;

let nextId = 1;

interface BenchData {
  id: number;
  label: Signal<string>;
}

const buildData = (count: number) => {
  let d = new Array(count);
  for (let i = 0; i < count; i++) {
    const label = signal(
      `${adjectives[random(adjectives.length)]} ${colors[random(colors.length)]} ${nouns[random(nouns.length)]}`
    );
    d[i] = { id: nextId++, label };
  }
  return d;
};

const ActionButton = (
  id: string,
  label: string,
  onclick: () => void
) =>
  div({ class: "col-sm-6" },
    button({ id, onclick, class: 'btn btn-primary btn-block col-md-6', type: "button" },
      label
    )
  )

function Foo() {
  return div({ id: 'main' },
    "Foobar"
  )
}

function Bench() {
  const rows = signal<BenchData[]>([]);
  const selected = signal<number | undefined>(undefined);

  const update = () => {
    batch(() => {
      for (let i = 0, d = rows(), len = d.length; i < len; i += 10) {
        d[i].label.set(`${d[i].label()} !!!`);
      }
    })
  };

  const swapRows = () => {
    const list = rows().slice();
    if (list.length > 998) {
      let item = list[1];
      list[1] = list[998];
      list[998] = item;
      rows.set(list);
    }
  };

  const remove = (id: number) => {
    rows.set(rows().filter(row => {
      const shouldKeep = row.id !== id;

      if (!shouldKeep) {
        row.label.cleanup();
      }

      return shouldKeep;
    }));
  }

  const clear = () => {
    rows.set([]);
  }

  return div({ id: 'main' },
    div({ class: 'container' },
      div({ class: 'jumbotron' },
        div({ class: 'row' },
          div({ class: 'col-md-6' }, h1('HellaJS Keyed')),
          div({ class: 'col-md-6' },
            div({ class: 'row' },
              ActionButton('run', 'Create 1,000 rows', () => rows.set(buildData(1000))),
              ActionButton('runlots', 'Create 10,000 rows', () => rows.set(buildData(10000))),
              ActionButton('add', 'Append 1,000 rows', () => rows.set([...rows(), ...buildData(1000)])),
              ActionButton('update', 'Update every 10th row', () => update()),
              ActionButton('clear', 'Clear', () => clear()),
              ActionButton('swaprows', 'Swap Rows', () => swapRows()),
            )
          ),
        ),
      ),
      Foo,
      table({ class: 'table table-hover table-striped test-rows' },
        tbody(
          For({
            each: rows,
            key: (row) => row.id,
            children: (row) =>
              tr({ key: row.id, 'rows-id': row.id, class: () => (selected() === row.id ? 'danger' : '') },
                td({ class: 'col-md-1' }, row.id),
                td({ class: 'col-md-4' },
                  a({ class: 'lbl', onclick: () => selected.set(row.id) },
                    row.label
                  ),
                ),
                td({ class: 'col-md-1' },
                  a({ class: 'remove', onclick: () => remove(row.id) },
                    span({ class: 'glyphicon glyphicon-remove', ariaHidden: 'true' })
                  ),
                ),
              )
          })
        ),
      ),
      span({ class: 'preloadicon glyphicon glyphicon-remove' }, ''),
    ),
  )
}
mount(Bench, document.body);