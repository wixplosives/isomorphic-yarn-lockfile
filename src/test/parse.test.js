/* eslint quotes: 0 */
import parse from "../parse.js";

function nullify(obj) {
  return Object.setPrototypeOf(obj, null);
}

test("parse", () => {
  // Yaml
  expect(parse("foo:\n  bar\n").object).toEqual(nullify({ foo: "bar" }));

  expect(parse('foo "bar"').object).toEqual(nullify({ foo: "bar" }));
  expect(parse('"foo" "bar"').object).toEqual(nullify({ foo: "bar" }));
  expect(parse('foo "bar"').object).toEqual(nullify({ foo: "bar" }));

  expect(parse(`foo:\n  bar "bar"`).object).toEqual(
    nullify({ foo: { bar: "bar" } })
  );
  expect(parse(`foo:\n  bar:\n  foo "bar"`).object).toEqual(
    nullify({ foo: { bar: {}, foo: "bar" } })
  );
  expect(parse(`foo:\n  bar:\n    foo "bar"`).object).toEqual(
    nullify({ foo: { bar: { foo: "bar" } } })
  );
  expect(parse(`foo:\r\n  bar:\r\n    foo "bar"`).object).toEqual(
    nullify({ foo: { bar: { foo: "bar" } } })
  );
  expect(parse("foo:\n  bar:\n    yes no\nbar:\n  yes no").object).toEqual(
    nullify({
      foo: {
        bar: {
          yes: "no",
        },
      },
      bar: {
        yes: "no",
      },
    })
  );
  expect(
    parse("foo:\r\n  bar:\r\n    yes no\r\nbar:\r\n  yes no").object
  ).toEqual(
    nullify({
      foo: {
        bar: {
          yes: "no",
        },
      },
      bar: {
        yes: "no",
      },
    })
  );
});

test("parse single merge conflict", () => {
  const file = `
a:
  no "yes"

<<<<<<< HEAD
b:
  foo "bar"
=======
c:
  bar "foo"
>>>>>>> branch-a

d:
  yes "no"
`;

  const { type, object } = parse(file);
  expect(type).toEqual("merge");
  expect(object).toEqual({
    a: { no: "yes" },
    b: { foo: "bar" },
    c: { bar: "foo" },
    d: { yes: "no" },
  });
});

test("parse single merge conflict with CRLF", () => {
  const file =
    'a:\r\n  no "yes"\r\n\r\n<<<<<<< HEAD\r\nb:\r\n  foo "bar"' +
    '\r\n=======\r\nc:\r\n  bar "foo"\r\n>>>>>>> branch-a' +
    '\r\n\r\nd:\r\n  yes "no"\r\n';

  const { type, object } = parse(file);
  expect(type).toEqual("merge");
  expect(object).toEqual({
    a: { no: "yes" },
    b: { foo: "bar" },
    c: { bar: "foo" },
    d: { yes: "no" },
  });
});

test("parse multiple merge conflicts", () => {
  const file = `
a:
  no "yes"

<<<<<<< HEAD
b:
  foo "bar"
=======
c:
  bar "foo"
>>>>>>> branch-a

d:
  yes "no"

<<<<<<< HEAD
e:
  foo "bar"
=======
f:
  bar "foo"
>>>>>>> branch-b
`;

  const { type, object } = parse(file);
  expect(type).toEqual("merge");
  expect(object).toEqual({
    a: { no: "yes" },
    b: { foo: "bar" },
    c: { bar: "foo" },
    d: { yes: "no" },
    e: { foo: "bar" },
    f: { bar: "foo" },
  });
});

test("parse merge conflict fail", () => {
  const file = `
<<<<<<< HEAD
b:
  foo: "bar
=======
c:
  bar "foo"
>>>>>>> branch-a
`;

  const { type, object } = parse(file);
  expect(type).toEqual("conflict");
  expect(Object.keys(object).length).toEqual(0);
});

test("discards common ancestors in merge conflicts", () => {
  const file = `
<<<<<<< HEAD
b:
  foo "bar"
||||||| common ancestor
d:
  yes "no"
=======
c:
  bar "foo"
>>>>>>> branch-a
`;

  const { type, object } = parse(file);
  expect(type).toEqual("merge");
  expect(object).toEqual({
    b: { foo: "bar" },
    c: { bar: "foo" },
  });
  expect(object.d).toBe(undefined);
});
