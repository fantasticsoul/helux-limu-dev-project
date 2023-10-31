import './styles.css';

async function main() {
  console.log('start main');
  await import('./loadApp18');
}

main().catch((err: any) => {
  alert(`Oops, something must he wrong! err message: ${err.message}`);
  console.error(err);
});

export const Index = 'Index';
