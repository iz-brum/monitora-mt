/* eslint-env node */
import LocationCache from '../../cache/locations/LocationCache.js';

async function run() {
    // 1. Limpa todos antes de começar o teste
    await LocationCache.limparTodos();
    console.log('→ Cache limpo!');

    // 2. Insere uma localização
    const locaisMT = [
        {
            latitude: -15.601410,
            longitude: -56.097892,
            cidade: 'Cuiabá',
            estado: 'MT',
            pais: 'Brasil',
            bairro: 'Centro',
            cep: '78000-000',
            endereco: 'Praça Alencastro, 100',
            tipo: 'address',
            outros_dados: { fonte: 'manual' }
        },
        {
            latitude: -14.067070,
            longitude: -57.182320,
            cidade: 'Tangará da Serra',
            estado: 'MT',
            pais: 'Brasil',
            bairro: 'Centro',
            cep: '78300-000',
            endereco: 'Av. Brasil, 234',
            tipo: 'address',
            outros_dados: { fonte: 'manual' }
        },
        {
            latitude: -12.729844,
            longitude: -60.131304,
            cidade: 'Juína',
            estado: 'MT',
            pais: 'Brasil',
            bairro: 'Centro',
            cep: '78320-000',
            endereco: 'Praça da Bíblia',
            tipo: 'address',
            outros_dados: { fonte: 'manual' }
        },
        {
            latitude: -13.016578,
            longitude: -55.262090,
            cidade: 'Sorriso',
            estado: 'MT',
            pais: 'Brasil',
            bairro: 'Centro',
            cep: '78890-000',
            endereco: 'Av. Blumenau, 560',
            tipo: 'address',
            outros_dados: { fonte: 'manual' }
        },
        {
            latitude: -11.856878,
            longitude: -55.501968,
            cidade: 'Sinop',
            estado: 'MT',
            pais: 'Brasil',
            bairro: 'Centro',
            cep: '78550-000',
            endereco: 'Av. das Embaúbas, 800',
            tipo: 'address',
            outros_dados: { fonte: 'manual' }
        },
        {
            latitude: -17.329700,
            longitude: -54.757400,
            cidade: 'Rondonópolis',
            estado: 'MT',
            pais: 'Brasil',
            bairro: 'Jardim Adriana',
            cep: '78700-000',
            endereco: 'Av. Amazonas, 400',
            tipo: 'address',
            outros_dados: { fonte: 'manual' }
        },
        {
            latitude: -16.075100,
            longitude: -53.537150,
            cidade: 'Cáceres',
            estado: 'MT',
            pais: 'Brasil',
            bairro: 'Centro',
            cep: '78200-000',
            endereco: 'Praça Barão do Rio Branco',
            tipo: 'address',
            outros_dados: { fonte: 'manual' }
        },
        {
            latitude: -10.337741,
            longitude: -54.928619,
            cidade: 'Alta Floresta',
            estado: 'MT',
            pais: 'Brasil',
            bairro: 'Centro',
            cep: '78580-000',
            endereco: 'Av. Ludovico da Riva Neto, 1200',
            tipo: 'address',
            outros_dados: { fonte: 'manual' }
        },
        {
            latitude: -15.078440,
            longitude: -58.224700,
            cidade: 'Cáceres',
            estado: 'MT',
            pais: 'Brasil',
            bairro: 'Marajoara',
            cep: '78208-136',
            endereco: 'Rua Marechal Rondon, 99',
            tipo: 'address',
            outros_dados: { fonte: 'manual' }
        },
        {
            latitude: -17.313670,
            longitude: -50.939900,
            cidade: 'Barra do Garças',
            estado: 'MT',
            pais: 'Brasil',
            bairro: 'Centro',
            cep: '78600-000',
            endereco: 'Rua Goiás, 100',
            tipo: 'address',
            outros_dados: { fonte: 'manual' }
        }
    ];

    for (const local of locaisMT) {
        await LocationCache.set(local);
    }

    console.log(`→ ${locaisMT.length} localizações salvas!`);

    // 3. Busca a primeira coordenada do array, mede tempo!
    const local = locaisMT[0];
    console.time('Tempo de consulta (get)');
    const found = await LocationCache.get(local.latitude, local.longitude);
    console.timeEnd('Tempo de consulta (get)');
    console.log('Resultado da busca:', found);

    // 4. Lista todos os registros, mede tempo!
    console.time('Tempo de consulta (listarTodos)');
    const all = await LocationCache.listarTodos();
    console.timeEnd('Tempo de consulta (listarTodos)');
    console.log('Lista de todos:', all);

    // 5. Busca por cidade e estado (usando cidade da primeira posição)
    const byCity = await LocationCache.getByCityState(local.cidade, local.estado);
    console.log('Busca por cidade/estado:', byCity);

    // 6. Limpa de novo e mostra vazio
    await LocationCache.limparTodos();
    const empty = await LocationCache.listarTodos();
    console.log('Cache após limpar:', empty);

    console.log('\n✅ Teste de LocationCache finalizado.');
}

run().catch(e => {
    console.error('❌ Erro nos testes:', e);
    // eslint-disable-next-line no-undef
    process.exit(1);
});
