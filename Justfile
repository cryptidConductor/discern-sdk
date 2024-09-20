install:
    for path in clients/* plugins/* sdk/*; do \
        pushd "$path"; \
        pnpm install; \
        popd; \
    done
