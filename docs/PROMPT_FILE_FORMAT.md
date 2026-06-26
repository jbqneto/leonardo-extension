# Prompt File Format

The extension reads plain text files.

## Rules

- One prompt per line.
- Empty lines are ignored.
- Lines starting with `#` are ignored.
- Leading and trailing spaces are removed.
- Prompts may contain commas, punctuation, and normal spaces.

## Correct

```txt
# Etsy Collection: Antique Frames

ornate antique gold picture frame, horizontal landscape orientation, isolated frame, centered object
ornate antique silver picture frame, horizontal landscape orientation, isolated frame, centered object
ornate antique black and gold picture frame, horizontal landscape orientation, isolated frame, centered object
```

## Incorrect

```txt
ornate antique gold frame ornate antique silver frame ornate antique black frame
```

Do not separate prompts by spaces because each prompt naturally contains spaces.

## Recommended prompt style for Etsy assets

Each prompt should define:

- subject
- style
- orientation
- background
- commercial usage constraints
- negative concepts if needed

Example:

```txt
ornate antique gold picture frame, horizontal landscape orientation, richly carved baroque details, isolated frame, empty inner area, centered composition, clean product cutout, neutral background, no text, no watermark
```
