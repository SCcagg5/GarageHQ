docker run --rm -v "$PWD:/out" debian:bookworm-slim bash -lc '
set -e
apt-get update
apt-get install -y --no-install-recommends libc6 libstdc++6
mkdir -p /tmp/rootfs/usr/glibc-compat/lib /tmp/rootfs/lib64
cp -av /lib/x86_64-linux-gnu/ld-linux-x86-64.so.2 /tmp/rootfs/lib64/
cp -av /lib/x86_64-linux-gnu/libc.so.6            /tmp/rootfs/usr/glibc-compat/lib/
cp -av /lib/x86_64-linux-gnu/libm.so.6            /tmp/rootfs/usr/glibc-compat/lib/
cp -av /lib/x86_64-linux-gnu/libpthread.so.0      /tmp/rootfs/usr/glibc-compat/lib/
cp -av /lib/x86_64-linux-gnu/librt.so.1           /tmp/rootfs/usr/glibc-compat/lib/
cp -av /lib/x86_64-linux-gnu/libdl.so.2           /tmp/rootfs/usr/glibc-compat/lib/
cp -av /lib/x86_64-linux-gnu/libgcc_s.so.1        /tmp/rootfs/usr/glibc-compat/lib/
cp -av /usr/lib/x86_64-linux-gnu/libstdc++.so.*   /tmp/rootfs/usr/glibc-compat/lib/
tar -C /tmp/rootfs -czf /out/glibc-runtime-amd64.tgz .
'
