import { NextResponse } from 'next/server';
import { db } from '@/lib/data';
import { PROJECT_ID } from '@/lib/constants';

const TASKS_DATA = [
  {
    title: '企画書の更新（コンセプト・ルール・操作）',
    description: '【仕様・設計 | システム】\nゲームの目的、ルール、操作方法をまとめる',
    priority: 'CRITICAL',
    status: 'TODO',
    progress: 0,
    tag: 'design',
  },
  {
    title: '効果音：ジャンプ・着地・敵撃破・被弾',
    description: '【プログラマ | システム】\nsfx_jump、sfx_slam、sfx_kill、sfx_hit を組み込み',
    priority: 'CRITICAL',
    status: 'TODO',
    progress: 0,
    tag: 'audio',
  },
  {
    title: 'BGM：戦闘（1曲）',
    description: '【デザイナ | システム】\nData/Audio/BGM に用意し、ループ再生',
    priority: 'HIGH',
    status: 'TODO',
    progress: 0,
    tag: 'audio',
  },
  {
    title: '効果音：ボス（咆哮・津波・叩きつけ）',
    description: '【プログラマ | システム】\nボスの各技に対応する効果音',
    priority: 'HIGH',
    status: 'TODO',
    progress: 0,
    tag: 'audio',
  },
  {
    title: 'BGM：タイトル・ボス・勝敗',
    description: '【デザイナ | システム】\n残りのBGMを用意',
    priority: 'NORMAL',
    status: 'TODO',
    progress: 0,
    tag: 'audio',
  },
  {
    title: '音量設定とフェード',
    description: '【プログラマ | システム】\nBGM/SFXの音量を調整、戦闘切替時にフェード',
    priority: 'NORMAL',
    status: 'TODO',
    progress: 0,
    tag: 'audio',
  },
  {
    title: 'タイトル画面',
    description: '【デザイナ | システム】\nロゴ、背景画像、モード選択の2枚のカード',
    priority: 'HIGH',
    status: 'TODO',
    progress: 0,
    tag: 'art',
  },
  {
    title: '戦闘HUD',
    description: '【デザイナ | システム】\nHPバー、ジャンプ冷却アイコン、ボスHPバー',
    priority: 'HIGH',
    status: 'TODO',
    progress: 0,
    tag: 'art',
  },
  {
    title: 'カード枠（レア度ごとの色）',
    description: '【デザイナ | システム】\nコモン・レア・ウルトラレアの枠と選択演出',
    priority: 'NORMAL',
    status: 'TODO',
    progress: 0,
    tag: 'art',
  },
  {
    title: 'ゲームオーバー・勝利画面',
    description: '【デザイナ | システム】\n結果を表す画像と文字',
    priority: 'NORMAL',
    status: 'TODO',
    progress: 0,
    tag: 'art',
  },
  {
    title: 'ポーズ画面（ESC）',
    description: '【プログラマ | システム】\nぼかし背景、音量、画面モード切替',
    priority: 'NORMAL',
    status: 'TODO',
    progress: 0,
    tag: 'code',
  },
  {
    title: '海底の砂テクスチャ',
    description: '【デザイナ | 背景・ステージ】\n砂と貝殻のテクスチャを床に適用',
    priority: 'CRITICAL',
    status: 'TODO',
    progress: 0,
    tag: 'art',
  },
  {
    title: '霧（SetFogEnable）',
    description: '【プログラマ | 背景・ステージ】\n青い霧を遠景に適用',
    priority: 'CRITICAL',
    status: 'TODO',
    progress: 0,
    tag: 'code',
  },
  {
    title: 'サンゴ礁・岩の壁',
    description: '【デザイナ | 背景・ステージ】\n床の周囲を囲う障壁を作成',
    priority: 'HIGH',
    status: 'TODO',
    progress: 0,
    tag: 'art',
  },
  {
    title: '泡パーティクル',
    description: '【プログラマ | 背景・ステージ】\n床から浮かぶ泡のエフェクト',
    priority: 'NORMAL',
    status: 'TODO',
    progress: 0,
    tag: 'code',
  },
  {
    title: '光の筋（God rays）',
    description: '【デザイナ | 背景・ステージ】\n水面からの光を中央に当てる',
    priority: 'LOW',
    status: 'TODO',
    progress: 0,
    tag: 'art',
  },
  {
    title: '魚のリグ（骨格）',
    description: '【デザイナ | プレイヤー】\n背骨4節、尾びれ、胸びれ2本',
    priority: 'HIGH',
    status: 'TODO',
    progress: 0,
    tag: 'art',
  },
  {
    title: '魚のアニメ：待機・泳ぎ',
    description: '【デザイナ | プレイヤー】\nAnim_Idle、Anim_Swim',
    priority: 'HIGH',
    status: 'TODO',
    progress: 0,
    tag: 'art',
  },
  {
    title: '魚のアニメ：跳躍・着地・被弾・死亡',
    description: '【デザイナ | プレイヤー】\nAnim_Leap、Anim_Apex_Fall、Anim_Slam_Impact、Anim_Hurt_Die',
    priority: 'NORMAL',
    status: 'TODO',
    progress: 0,
    tag: 'art',
  },
  {
    title: 'クジラボスのモデル',
    description: '【デザイナ | 敵・ボス】\nWhaleBoss.mv1 に置き換え（現在は箱）',
    priority: 'HIGH',
    status: 'TODO',
    progress: 0,
    tag: 'art',
  },
  {
    title: '雑魚5種のテクスチャとアニメ',
    description: '【デザイナ | 敵・ボス】\nMinion、Hopper、Tanker、Float、Charge',
    priority: 'NORMAL',
    status: 'TODO',
    progress: 0,
    tag: 'art',
  },
  {
    title: 'CollisionUtil.h に当たり判定をまとめる',
    description: '【プログラマ | システム】\n距離計算と円柱判定を共通関数にする',
    priority: 'LOW',
    status: 'TODO',
    progress: 0,
    tag: 'code',
  },
  {
    title: '敵データを EnemyTypeConfig に移す',
    description: '【プログラマ | システム】\nHP、速度、ダメージ、出現率を表形式に',
    priority: 'LOW',
    status: 'TODO',
    progress: 0,
    tag: 'code',
  },
  {
    title: '描画補間（Render Interpolation）',
    description: '【プログラマ | システム】\n滑らかな表示（144Hz以上向け）',
    priority: 'LOW',
    status: 'TODO',
    progress: 0,
    tag: 'code',
  },
  {
    title: 'ゲームパッド対応',
    description: '【プログラマ | システム】\n左スティックで360度移動、ボタン、振動',
    priority: 'LOW',
    status: 'TODO',
    progress: 0,
    tag: 'code',
  },
  {
    title: 'Release版の作成',
    description: '【プログラマ | システム】\nデバッグキーを除外し、パッケージ化',
    priority: 'NORMAL',
    status: 'TODO',
    progress: 0,
    tag: 'code',
  },
  // 7 task hoàn thành (済)
  {
    title: 'ジャンプ・スラム・無敵時間',
    description: '【プログラマ | プレイヤー】\n完了済みタスク（済）',
    priority: 'NORMAL',
    status: 'DONE',
    progress: 100,
    tag: 'code',
  },
  {
    title: '敵5種とAI',
    description: '【プログラマ | 敵・ボス】\n完了済みタスク（済）',
    priority: 'NORMAL',
    status: 'DONE',
    progress: 100,
    tag: 'code',
  },
  {
    title: 'クジラボス2段階と津波',
    description: '【プログラマ | 敵・ボス】\n完了済みタスク（済）',
    priority: 'NORMAL',
    status: 'DONE',
    progress: 100,
    tag: 'code',
  },
  {
    title: 'カード8種とルール',
    description: '【プログラマ | システム】\n完了済みタスク（済）',
    priority: 'NORMAL',
    status: 'DONE',
    progress: 100,
    tag: 'code',
  },
  {
    title: 'エンドレスモードとハイスコア',
    description: '【プログラマ | システム】\n完了済みタスク（済）',
    priority: 'NORMAL',
    status: 'DONE',
    progress: 100,
    tag: 'code',
  },
  {
    title: 'カメラ・揺れ・デッドゾーン',
    description: '【プログラマ | カメラ】\n完了済みタスク（済）',
    priority: 'NORMAL',
    status: 'DONE',
    progress: 100,
    tag: 'code',
  },
  {
    title: '120Hz固定ステップとオブジェクトプール',
    description: '【プログラマ | システム】\n完了済みタスク（済）',
    priority: 'NORMAL',
    status: 'DONE',
    progress: 100,
    tag: 'code',
  },
];

export async function GET() {
  const client = db();
  const CREATOR_ID = '00000000-0000-4000-8000-000000000001';

  // Lấy danh sách task hiện tại trên Supabase để tránh tạo trùng
  const { data: existing, error: fetchErr } = await client.from('tasks').select('title');
  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const existingTitles = new Set((existing ?? []).map((t) => t.title));
  const toInsert = TASKS_DATA.filter((t) => !existingTitles.has(t.title)).map((t) => ({
    project_id: PROJECT_ID,
    creator_id: CREATOR_ID,
    assignee_id: null,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    progress: t.progress,
    deadline: null,
    tag: t.tag,
  }));

  if (toInsert.length === 0) {
    const { data: allTasks } = await client.from('tasks').select('*');
    return NextResponse.json({
      message: 'All tasks already exist',
      totalCount: allTasks?.length ?? 0,
      tasks: allTasks,
    });
  }

  const { data: inserted, error: insertErr } = await client
    .from('tasks')
    .insert(toInsert)
    .select('id, title');

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const { data: allTasks } = await client.from('tasks').select('*');

  return NextResponse.json({
    message: 'Seeded tasks successfully',
    insertedCount: inserted?.length ?? 0,
    totalCount: allTasks?.length ?? 0,
    tasks: allTasks,
  });
}
