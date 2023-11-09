import './styles.css';

async function main() {
  console.log('start main');
  await import('./loadApp18');
}

main().catch((err: any) => {
  console.error(err);
  alert(`Oops, something must he wrong! err message: ${err.message}`);
});

export const Index = 'Index';
