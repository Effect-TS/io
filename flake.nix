{
  inputs = {
    nixpkgs = {
      url = "github:nixos/nixpkgs/nixpkgs-unstable";
    };
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    # Helper generating outputs for each desired system
    forAllSystems = nixpkgs.lib.genAttrs [
      "x86_64-darwin"
      "x86_64-linux"
      "aarch64-darwin"
      "aarch64-linux"
    ];

    # Import nixpkgs' package set for each system.
    nixpkgsFor = forAllSystems (system:
      import nixpkgs {
        inherit system;
      });
  in {
    formatter = forAllSystems (system: nixpkgsFor.${system}.alejandra);

    devShells = forAllSystems (system: let
      pkgs = nixpkgs.legacyPackages.${system};
      nodePackages = import ./infra/default.nix { inherit pkgs; };
    in {
      default = nixpkgsFor.${system}.mkShell {
        buildInputs = [
          nixpkgsFor.${system}.nodejs-16_x
        ] ++ builtins.attrValues nodePackages;
      };
    });
  };
}
