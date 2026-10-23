# dev.nix for SUNOUF (صنوف) Platform - C++ Crow Framework Environment
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "sunouf-cpp-crow-env";

  # C++ Toolchain & dependencies for Crow framework and REST endpoints
  packages = [
    pkgs.gcc
    pkgs.gnumake
    pkgs.cmake
    pkgs.pkg-config
    pkgs.crow
    pkgs.nlohmann_json
    pkgs.boost
    pkgs.asio
    pkgs.openssl
    pkgs.zlib
  ];

  shellHook = ''
    echo "=========================================================="
    echo " منصة صنوف (SUNOUF) - بيئة تطوير C++ Crow Framework"
    echo "=========================================================="
    echo "لترجمة وتشغيل الخادم:"
    echo "  g++ -std=c++17 -O2 server.cpp -o sunouf_server -lpthread -lboost_system"
    echo "  ./sunouf_server"
    echo "سيعمل الخادم على المنفذ: http://localhost:8080"
  '';
}
