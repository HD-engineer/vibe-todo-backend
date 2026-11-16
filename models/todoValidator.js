const todoValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["title", "completed", "updatedAt"],
    properties: {
      title: {
        bsonType: "string",
        minLength: 1,
        maxLength: 500,
        description: "할 일 내용",
      },
      createdAt: {
        bsonType: "date",
        description: "생성 시간",
      },
      updatedAt: {
        bsonType: "date",
        description: "마지막 수정 시간",
      },
    },
  },
};

module.exports = todoValidator;
