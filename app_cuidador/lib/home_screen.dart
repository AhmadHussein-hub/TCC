import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'widgets/dashboard_header.dart';
import 'widgets/medication_card.dart';
import 'add_medicamento_screen.dart';
import 'ai_summary_screen.dart';
import 'login_screen.dart';
import 'detalhes_medicamento_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final supabase = Supabase.instance.client;
  late Future<Map<String, dynamic>> _dadosPainel;

  @override
  void initState() {
    super.initState();
    _dadosPainel = _carregarDadosPainel();
  }

  void _recarregarDados() {
    setState(() {
      _dadosPainel = _carregarDadosPainel();
    });
  }

  Future<Map<String, dynamic>> _carregarDadosPainel() async {
    final pacienteRes = await supabase
        .from('paciente')
        .select()
        .limit(1)
        .maybeSingle();
    final medicamentosRes = await supabase
        .from('medicamento')
        .select()
        .order('id_medicamento', ascending: true);

    return {
      'paciente': pacienteRes ?? {'nome': 'Sr. João Silva'},
      'medicamentos': List<Map<String, dynamic>>.from(medicamentosRes),
    };
  }

  Future<void> _fazerLogout() async {
    await supabase.auth.signOut();
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }

  Future<void> _deletarMedicamento(int idMedicamento) async {
    try {
      await supabase
          .from('medicamento')
          .delete()
          .eq('id_medicamento', idMedicamento);
      _recarregarDados();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Medicamento excluído com sucesso!'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao excluir: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  // Função que regista no banco que o idoso tomou o remédio
  Future<void> _confirmarMedicamentoTomado(Map<String, dynamic> med) async {
    final stopwatch = Stopwatch()..start(); // 1. INICIA O CRONÔMETRO AQUI
    try {
      await supabase.from('registro_consumo').insert({
        'id_medicamento': med['id_medicamento'],
        'id_paciente': med['id_paciente'],
        'status': 'TOMADO',
        'horario_registro': DateTime.now().toIso8601String(),
      });
      stopwatch.stop(); // 2. PARA O CRONÔMETRO AQUI
      print(
        '>>> TEMPO DE INSERT SUPABASE: ${stopwatch.elapsedMilliseconds} ms <<<',
      ); // 3. IMPRIME O RESULTADO

      _recarregarDados();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Dose de ${med['nome_farmaco']} confirmada com sucesso!',
          ),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao registrar consumo: $e'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  void _abrirTelaEdicao(Map<String, dynamic> med) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AddMedicamentoScreen(medicamentoParaEditar: med),
      ),
    );
    _recarregarDados();
  }

  Future<void> _confirmarExclusao(Map<String, dynamic> med) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Excluir medicamento?'),
        content: Text(
          'Tem certeza que deseja excluir "${med['nome_farmaco']}"? Esta ação não pode ser desfeita.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Excluir', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirmar == true) {
      _deletarMedicamento(med['id_medicamento']);
    }
  }

  void _mostrarOpcoesMedicamento(Map<String, dynamic> med) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                med['nome_farmaco'] ?? 'Medicamento',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Dosagem: ${med['dosagem'] ?? 'Não informada'}',
                style: const TextStyle(color: Colors.grey),
              ),
              const Divider(height: 32),
              ListTile(
                leading: const Icon(Icons.edit, color: Color(0xFF2563EB)),
                title: const Text('Editar Medicamento'),
                onTap: () {
                  Navigator.pop(context);
                  _abrirTelaEdicao(med);
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete, color: Colors.red),
                title: const Text(
                  'Excluir Medicamento',
                  style: TextStyle(color: Colors.red),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _deletarMedicamento(med['id_medicamento']);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FutureBuilder<Map<String, dynamic>>(
        future: _dadosPainel,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting &&
              !snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Text('Erro ao carregar dados: ${snapshot.error}'),
            );
          }

          final dados = snapshot.data ?? {};
          final pacienteMap = dados['paciente'] as Map<String, dynamic>;
          final String nomePaciente =
              pacienteMap['nome'] ??
              pacienteMap['nome_completo'] ??
              'Sr. João Silva';
          final medicamentos =
              dados['medicamentos'] as List<Map<String, dynamic>>;

          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DashboardHeader(
                  patientName: nomePaciente,
                  completedDoses: 1,
                  totalDoses: medicamentos.length,
                  dateText: 'Painel do Cuidador',
                  onAiReportTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) =>
                            const AiSummaryScreen(pacienteId: 1),
                      ),
                    );
                  },
                  onLogout: () {
                    showDialog(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Encerrar Sessão'),
                        content: const Text(
                          'Deseja realmente sair da sua conta?',
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('Cancelar'),
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.pop(context);
                              _fazerLogout();
                            },
                            child: const Text(
                              'Sair',
                              style: TextStyle(color: Colors.red),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),

                const Padding(
                  padding: EdgeInsets.only(
                    left: 24.0,
                    right: 24.0,
                    top: 32.0,
                    bottom: 16.0,
                  ),
                  child: Text(
                    'LEMBRETES DO DIA',
                    style: TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.0,
                    ),
                  ),
                ),

                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0),
                  child: medicamentos.isEmpty
                      ? const Center(
                          child: Text('Nenhum medicamento cadastrado.'),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: medicamentos.length,
                          itemBuilder: (context, index) {
                            final med = medicamentos[index];
                            final String nomeFarmaco =
                                med['nome_farmaco'] ?? 'Remédio';
                            final String dosagem = med['dosagem'] ?? '';

                            final rawHora = med['hora_inicio'];
                            final String horaInicio = rawHora != null
                                ? rawHora.toString()
                                : 'A definir';
                            final String horarioFormatado =
                                horaInicio.length >= 5
                                ? horaInicio.substring(0, 5)
                                : horaInicio;

                            return MedicationCard(
                              time: horarioFormatado,
                              name: '$nomeFarmaco ($dosagem)',
                              statusText: rawHora != null
                                  ? 'Agendado / Frequência de ${med['frequencia_horas'] ?? 24}h'
                                  : 'Horário não configurado',
                              statusColor: rawHora != null
                                  ? const Color(0xFFF59E0B)
                                  : Colors.grey,
                              statusIcon: Icon(
                                rawHora != null
                                    ? Icons.access_time
                                    : Icons.help_outline,
                                color: rawHora != null
                                    ? const Color(0xFFF59E0B)
                                    : Colors.grey,
                                size: 24,
                              ),
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) =>
                                        DetalhesMedicamentoScreen(
                                          medicamento: med,
                                        ),
                                  ),
                                ).then((_) => _recarregarDados());
                              },
                              onConfirmarTomado: () =>
                                  _confirmarMedicamentoTomado(med),
                              onEdit: () => _abrirTelaEdicao(med),
                              onDelete: () => _confirmarExclusao(med),
                            );
                          },
                        ),
                ),
                const SizedBox(height: 80),
              ],
            ),
          );
        },
      ),

      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const AddMedicamentoScreen(),
            ),
          );
          _recarregarDados();
        },
        backgroundColor: const Color(0xFF2563EB),
        elevation: 4,
        shape: const CircleBorder(),
        child: const Icon(Icons.add, color: Colors.white, size: 32),
      ),
    );
  }
}
