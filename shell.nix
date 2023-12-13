{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs_20
    pkgs.nodePackages.typescript
    pkgs.nodePackages.nodemon
    # ... other dependencies ...
  ];
}